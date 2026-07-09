"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { loginSchema, registerSchema } from "@/lib/validators/auth";
import { createUser, getUserByEmail, recordLoginHistory } from "@/services/users/user.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { establishSession, revokeSession } from "@/services/users/session.service";
import { notify } from "@/services/notifications/notify.service";
import { verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { getSession, clearSessionCookie } from "@/lib/auth/session";
import { isAppError } from "@/lib/errors";
import { checkLoginRateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";
import { ROLE_HOME_ROUTE, Role, UserStatus } from "@/lib/constants/roles";

export interface AuthActionState {
  error?: string;
}

export async function registerAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { ipAddress, userAgent } = await getRequestMeta();
  const rateLimit = checkLoginRateLimit(`register:${ipAddress ?? "unknown"}`);
  if (!rateLimit.allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  let role: Role;

  try {
    const user = await createUser(parsed.data);
    role = user.role;
    await establishSession(user.id, user.role, { ipAddress, userAgent });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(role === Role.SELLER ? ROUTES.seller.onboarding.personal : ROLE_HOME_ROUTE[role]);
}

export async function loginAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: z.prettifyError(parsed.error) };
  }

  const { email, password, rememberMe } = parsed.data;
  const { ipAddress, userAgent } = await getRequestMeta();

  const rateLimit = checkLoginRateLimit(`${email}:${ipAddress ?? "unknown"}`);
  if (!rateLimit.allowed) {
    return { error: "Too many login attempts. Please try again in a few minutes." };
  }

  const user = await getUserByEmail(email);

  // Always run bcrypt, even for a nonexistent user, against a fixed dummy
  // hash — keeps timing constant so a missing account can't be inferred
  // from response latency. Passwords are still compared for real accounts.
  const passwordValid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !user.passwordHash || !passwordValid) {
    if (user) {
      await recordLoginHistory(user.id, false, { reason: "WRONG_PASSWORD", ipAddress, userAgent });
    }
    return { error: "Invalid email or password" };
  }

  // Only reveal account-status detail once the password has been proven
  // correct — otherwise "this account is suspended" leaks account
  // existence to anyone who merely knows an email address.
  if (user.status !== UserStatus.ACTIVE) {
    await recordLoginHistory(user.id, false, { reason: `ACCOUNT_${user.status}`, ipAddress, userAgent });
    const messages: Record<string, string> = {
      INACTIVE: "Your account has been deactivated. Please contact support to reactivate it.",
      SUSPENDED: "Your account has been suspended. Please contact support.",
      BANNED: "Your account has been banned.",
    };
    return { error: messages[user.status] ?? "Your account cannot sign in right now." };
  }

  await recordLoginHistory(user.id, true, { ipAddress, userAgent });
  await establishSession(user.id, user.role, { ipAddress, userAgent, rememberMe });

  const loginMessage = `New login to your account${ipAddress ? ` from ${ipAddress}` : ""}.`;
  await notify({
    event: "SECURITY_ALERT",
    userId: user.id,
    title: "New login",
    message: loginMessage,
    emailVariables: { message: loginMessage },
  });

  let destination: string = ROLE_HOME_ROUTE[user.role];
  if (user.role === Role.SELLER) {
    const sellerProfile = await getSellerProfileByUserId(user.id);
    destination = sellerProfile.onboardingCompletedAt ? ROUTES.seller.dashboard : ROUTES.seller.onboarding.personal;
  }

  redirect(destination);
}

export async function logoutAction() {
  const session = await getSession();
  if (session?.sessionId) {
    await revokeSession(session.userId, session.userId, session.sessionId);
  }
  await clearSessionCookie();
  redirect(ROUTES.login);
}
