"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPendingGoogleSignupToken } from "@/lib/auth/google";
import { findGoogleUser, createGoogleUser, recordLoginHistory } from "@/services/users/user.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { establishSession } from "@/services/users/session.service";
import { notify } from "@/services/notifications/notify.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { PENDING_GOOGLE_SIGNUP_COOKIE_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { ROLE_HOME_ROUTE, Role } from "@/lib/constants/roles";

export async function finalizeGoogleSignupAction(intent: "BUYER" | "SELLER") {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_GOOGLE_SIGNUP_COOKIE_NAME)?.value;
  const profile = token ? await verifyPendingGoogleSignupToken(token) : null;
  if (!profile) redirect(ROUTES.register);

  const { ipAddress, userAgent } = await getRequestMeta();

  // Re-check first — covers a second tab/device completing the same Google
  // identity while this one sat on the welcome screen.
  const user = (await findGoogleUser(profile)) ?? (await createGoogleUser(profile, intent));

  cookieStore.delete(PENDING_GOOGLE_SIGNUP_COOKIE_NAME);

  await recordLoginHistory(user.id, true, { ipAddress, userAgent });
  await establishSession(user.id, user.role, { ipAddress, userAgent, rememberMe: true });

  const justRegistered = Date.now() - user.createdAt.getTime() < 10_000;
  if (!justRegistered) {
    const loginMessage = `New login to your account${ipAddress ? ` from ${ipAddress}` : ""}.`;
    await notify({
      event: "SECURITY_ALERT",
      userId: user.id,
      title: "New login",
      message: loginMessage,
      emailVariables: { message: loginMessage },
    });
  }

  let destination: string = ROLE_HOME_ROUTE[user.role];
  if (user.role === Role.SELLER) {
    const sellerProfile = await getSellerProfileByUserId(user.id);
    destination = sellerProfile.onboardingCompletedAt ? ROUTES.seller.dashboard : ROUTES.seller.onboarding.personal;
  }

  redirect(destination);
}
