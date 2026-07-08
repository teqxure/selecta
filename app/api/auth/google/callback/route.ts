import { NextResponse } from "next/server";
import { verifyGoogleOAuthState, exchangeGoogleCode, verifyGoogleIdToken } from "@/lib/auth/google";
import { findOrCreateGoogleUser, recordLoginHistory } from "@/services/users/user.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { setSessionCookie } from "@/lib/auth/session";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";
import { ROLE_HOME_ROUTE, Role, UserStatus } from "@/lib/constants/roles";
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

  const user = await findOrCreateGoogleUser(profile, state.role);

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
  await setSessionCookie({ userId: user.id, role: user.role }, true);

  let destination: string = ROLE_HOME_ROUTE[user.role];
  if (user.role === Role.SELLER) {
    const sellerProfile = await getSellerProfileByUserId(user.id);
    destination = sellerProfile.onboardingCompletedAt ? ROUTES.seller.dashboard : ROUTES.seller.onboarding.personal;
  }

  return NextResponse.redirect(new URL(destination, request.url));
}
