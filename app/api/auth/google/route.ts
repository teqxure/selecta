import { NextResponse } from "next/server";
import { isGoogleAuthConfigured, buildGoogleAuthUrl, createGoogleOAuthState, type GoogleRole } from "@/lib/auth/google";
import { PUBLIC_REGISTER_ROLES } from "@/lib/validators/auth";
import { ROUTES } from "@/lib/constants/routes";

export const runtime = "nodejs";

/**
 * Initiates Sign in with Google. `?role=` reflects the register page's
 * BUYER/SELLER picker; ignored for existing accounts. Left undefined (e.g.
 * the login page's button, which has no intent to signal) for a brand-new
 * account, the callback defers to /welcome instead of guessing a role.
 */
export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL(`${ROUTES.login}?error=google_not_configured`, request.url));
  }

  const requestedRole = new URL(request.url).searchParams.get("role");
  const role: GoogleRole | undefined = PUBLIC_REGISTER_ROLES.includes(requestedRole as GoogleRole)
    ? (requestedRole as GoogleRole)
    : undefined;

  const state = await createGoogleOAuthState(role);
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
