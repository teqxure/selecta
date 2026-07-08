import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionToken, verifySessionTokenDetailed, cookieOptions } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_REFRESH_THRESHOLD_SECONDS } from "@/lib/constants/app";
import { ROUTE_ROLE_ACCESS, Role } from "@/lib/constants/roles";
import { ROUTES, AUTH_REQUIRED_PREFIXES } from "@/lib/constants/routes";
import { applySecurityHeaders } from "@/lib/security/headers";
import { env } from "@/lib/env";

function matchPrefix(pathname: string, prefixes: readonly string[]) {
  return prefixes.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/** Still served as-is even on the admin subdomain — the login/register forms, which aren't under `/admin`. (API routes and Next's own build assets never reach here — see `config.matcher` below.) */
const ADMIN_HOST_PASSTHROUGH_PREFIXES = ["/login", "/register"];

/** A request for an actual file — `/Selecta.png`, `/icon.png`, `/robots.txt` — never a page route, so it must never get an `/admin` prefix stuck on it. */
const FILE_EXTENSION_PATTERN = /\.[a-zA-Z0-9]+$/;

/**
 * `NEXT_PUBLIC_ADMIN_HOST` (e.g. "admin.selectapick.store") is a cosmetic
 * front door onto this same deployment's `/admin` route group, not a
 * separate app. A bare path on that host (`/users`) is rewritten to
 * `/admin/users` invisibly; a path that already starts with `/admin`
 * (e.g. from an existing `<Link href="/admin/...">`) is left alone, since
 * it's already pointing at the right place. Static files under `/public`
 * (images, icons, etc.) are served as-is too — prefixing them with
 * `/admin` made them look like an auth-gated admin page, breaking every
 * image referenced by an absolute path (including the dashboard's own
 * logo) on this host.
 */
function rewriteForAdminHost(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  if (!env.NEXT_PUBLIC_ADMIN_HOST) return pathname;

  const host = request.headers.get("host") ?? "";
  const isAdminHost = host === env.NEXT_PUBLIC_ADMIN_HOST || host.startsWith(`${env.NEXT_PUBLIC_ADMIN_HOST}:`);
  if (!isAdminHost) return pathname;
  if (pathname.startsWith("/admin")) return pathname;
  if (matchPrefix(pathname, ADMIN_HOST_PASSTHROUGH_PREFIXES)) return pathname;
  if (FILE_EXTENSION_PATTERN.test(pathname)) return pathname;

  return pathname === "/" ? "/admin" : `/admin${pathname}`;
}

/**
 * Once the admin subdomain is configured, `/admin` on the main domain is
 * no longer a valid way in — this redirects it to the equivalent path on
 * the subdomain instead, regardless of auth state, so there's exactly one
 * front door to the admin console. Runs before any auth check on purpose:
 * an already-logged-in admin visiting the old bookmarked path should be
 * bounced to the subdomain too, not silently keep working there.
 */
function redirectAwayFromMainDomainAdminPath(request: NextRequest): URL | null {
  if (!env.NEXT_PUBLIC_ADMIN_HOST) return null;

  const host = request.headers.get("host") ?? "";
  const isAdminHost = host === env.NEXT_PUBLIC_ADMIN_HOST || host.startsWith(`${env.NEXT_PUBLIC_ADMIN_HOST}:`);
  if (isAdminHost) return null;

  const pathname = request.nextUrl.pathname;
  if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return null;

  const rest = pathname.slice("/admin".length); // "" or "/users" etc.
  const target = new URL(`https://${env.NEXT_PUBLIC_ADMIN_HOST}${rest || "/"}`);
  target.search = request.nextUrl.search;
  return target;
}

/**
 * Optimistic, cookie-only auth check. Proxy runs before every matched
 * request and must stay fast — no database calls here (see Next.js Proxy
 * guide). The real authorization check happens again in the Server
 * Action/Route Handler via `requireRole`/`requireAuth` in lib/auth/rbac.ts.
 */
export async function proxy(request: NextRequest) {
  const adminPathRedirect = redirectAwayFromMainDomainAdminPath(request);
  if (adminPathRedirect) return NextResponse.redirect(adminPathRedirect, 308);

  const rewrittenPathname = rewriteForAdminHost(request);
  const isRewritten = rewrittenPathname !== request.nextUrl.pathname;

  const response = isRewritten
    ? NextResponse.rewrite(new URL(`${rewrittenPathname}${request.nextUrl.search}`, request.url))
    : NextResponse.next();
  applySecurityHeaders(response.headers);

  const pathname = rewrittenPathname;
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
      { userId: session.userId, role: session.role, sessionId: session.sessionId },
      originalDuration,
    );
    response.cookies.set(SESSION_COOKIE_NAME, refreshedToken, { ...cookieOptions, maxAge: originalDuration });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
