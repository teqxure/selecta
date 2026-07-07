import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionToken, verifySessionTokenDetailed } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_REFRESH_THRESHOLD_SECONDS } from "@/lib/constants/app";
import { ROUTE_ROLE_ACCESS, Role } from "@/lib/constants/roles";
import { ROUTES, AUTH_REQUIRED_PREFIXES } from "@/lib/constants/routes";
import { applySecurityHeaders } from "@/lib/security/headers";

function matchPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Optimistic, cookie-only auth check. Proxy runs before every matched
 * request and must stay fast — no database calls here (see Next.js Proxy
 * guide). The real authorization check happens again in the Server
 * Action/Route Handler via `requireRole`/`requireAuth` in lib/auth/rbac.ts.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  applySecurityHeaders(response.headers);

  const pathname = request.nextUrl.pathname;
  const roleRestrictedPrefix = matchPrefix(pathname, Object.keys(ROUTE_ROLE_ACCESS));
  const requiresAnyAuth = matchPrefix(pathname, AUTH_REQUIRED_PREFIXES);

  if (!roleRestrictedPrefix && !requiresAnyAuth) return response;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const redirectToLogin = () => {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (!token) return redirectToLogin();

  const session = await verifySessionTokenDetailed(token);
  if (!session) return redirectToLogin();

  if (roleRestrictedPrefix) {
    const allowedRoles = ROUTE_ROLE_ACCESS[roleRestrictedPrefix] as Role[];
    if (!allowedRoles.includes(session.role)) return redirectToLogin();
  }

  // Sliding expiration: reissue the cookie once it's past its refresh
  // threshold so an active user is never logged out mid-session, without
  // extending a truly abandoned session indefinitely.
  const remainingSeconds = session.expiresAt - Math.floor(Date.now() / 1000);
  if (remainingSeconds < SESSION_REFRESH_THRESHOLD_SECONDS) {
    const originalDuration = session.expiresAt - session.issuedAt;
    const refreshedToken = await createSessionToken(
      { userId: session.userId, role: session.role },
      originalDuration,
    );
    response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: originalDuration,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/seller/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/saved/:path*",
    "/cart/:path*",
    "/notifications/:path*",
    "/messages/:path*",
  ],
};
