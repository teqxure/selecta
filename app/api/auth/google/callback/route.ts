import { NextResponse } from "next/server";
import { verifyGoogleOAuthState, exchangeGoogleCode, verifyGoogleIdToken, createPendingGoogleSignupToken } from "@/lib/auth/google";
import { findGoogleUser, createGoogleUser, recordLoginHistory } from "@/services/users/user.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { establishSession } from "@/services/users/session.service";
import { notify } from "@/services/notifications/notify.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";
import { ROLE_HOME_ROUTE, Role, UserStatus } from "@/lib/constants/roles";
import { PENDING_GOOGLE_SIGNUP_COOKIE_NAME } from "@/lib/constants/app";
import { cookieOptions } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

function loginFailure(request: Request, error: string) {
  return NextResponse.redirect(new URL(`${ROUTES.login}?error=${error}`, request.url));
}

/** Handles Google's redirect back after the user grants (or denies) access. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const googleError = url.searchParams.get("error");

  if (googleError) return loginFailure(request, "google_denied");
  if (!code || !stateToken) return loginFailure(request, "google_failed");

  const state = await verifyGoogleOAuthState(stateToken);
  if (!state) return loginFailure(request, "google_failed");

  const { ipAddress, userAgent } = await getRequestMeta();

  let profile;
  try {
    const tokens = await exchangeGoogleCode(code);
    profile = await verifyGoogleIdToken(tokens.id_token);
  } catch (error) {
    logger.error("Google OAuth exchange/verify failed", { error: String(error) });
    return loginFailure(request, "google_failed");
  }

  const existingUser = await findGoogleUser(profile);

  if (!existingUser && !state.role) {
    // Brand-new account with no intent signal (e.g. the login page's Google
    // button) — defer creation to /welcome instead of guessing a role.
    const pendingToken = await createPendingGoogleSignupToken(profile);
    const response = NextResponse.redirect(new URL(ROUTES.welcome, request.url));
    response.cookies.set(PENDING_GOOGLE_SIGNUP_COOKIE_NAME, pendingToken, { ...cookieOptions, maxAge: 10 * 60 });
    return response;
  }

  const user = existingUser ?? (await createGoogleUser(profile, state.role!));

  if (user.status !== UserStatus.ACTIVE) {
    await recordLoginHistory(user.id, false, { reason: `ACCOUNT_${user.status}`, ipAddress, userAgent });
    const errorByStatus: Record<string, string> = {
      INACTIVE: "account_inactive",
      SUSPENDED: "account_suspended",
      BANNED: "account_banned",
    };
    return loginFailure(request, errorByStatus[user.status] ?? "google_failed");
  }

  await recordLoginHistory(user.id, true, { ipAddress, userAgent });
  await establishSession(user.id, user.role, { ipAddress, userAgent, rememberMe: true });

  // Skip the "new login" alert for an account created moments ago in this
  // same request (via findOrCreateGoogleUser) — the welcome email already
  // covers a brand-new signup; this is only for a returning user's login.
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

  return NextResponse.redirect(new URL(destination, request.url));
}
