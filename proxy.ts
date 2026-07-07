import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { env } from "@/lib/env";
import { SESSION_COOKIE_NAME } from "@/lib/constants/app";
import { ROUTE_ROLE_ACCESS, Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { applySecurityHeaders } from "@/lib/security/headers";

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);

/**
 * Optimistic, cookie-only auth check. Proxy runs before every matched
 * request and must stay fast — no database calls here (see Next.js Proxy
 * guide). The real authorization check happens again in the Server
 * Action/Route Handler via `requireRole` in lib/auth/rbac.ts.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  applySecurityHeaders(response.headers);

  const pathname = request.nextUrl.pathname;
  const matchedPrefix = Object.keys(ROUTE_ROLE_ACCESS).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!matchedPrefix) return response;

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const allowedRoles = ROUTE_ROLE_ACCESS[matchedPrefix];

  const redirectToLogin = () => {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (!token) return redirectToLogin();

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const role = payload.role as Role | undefined;
    if (!role || !allowedRoles.includes(role)) return redirectToLogin();
  } catch {
    return redirectToLogin();
  }

  return response;
}

export const config = {
  matcher: ["/seller/:path*", "/admin/:path*"],
};
