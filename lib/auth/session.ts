import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { Role } from "@/lib/constants/roles";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, SHORT_SESSION_MAX_AGE_SECONDS } from "@/lib/constants/app";

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);

export interface SessionPayload {
  userId: string;
  role: Role;
  /**
   * The DB `Session` row id ("sid" claim) — present on every session
   * created after session tracking was introduced. Absent on tokens
   * issued before that (pre-existing logged-in users): those are treated
   * as unrevocable and simply age out at their existing expiry, so
   * shipping this feature doesn't force-log-out anyone already signed in.
   */
  sessionId?: string;
}

/** Full decoded token, including timing, for sliding-expiration decisions in proxy.ts. */
export interface SessionTokenMeta extends SessionPayload {
  issuedAt: number;
  expiresAt: number;
}

export async function createSessionToken(payload: SessionPayload, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  const detailed = await verifySessionTokenDetailed(token);
  if (!detailed) return null;
  return { userId: detailed.userId, role: detailed.role, sessionId: detailed.sessionId };
}

/** Used by proxy.ts to decide whether a session needs sliding-expiration refresh. */
export async function verifySessionTokenDetailed(token: string): Promise<SessionTokenMeta | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : undefined;
    return { userId: payload.userId, role: payload.role as Role, sessionId, issuedAt: payload.iat, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

/**
 * `domain` is omitted (host-only cookie) unless `COOKIE_DOMAIN` is set —
 * that's the opt-in for sharing one login between the main site and the
 * admin subdomain (see lib/env.ts). A cookie set with a `domain` must also
 * be *cleared* with that same `domain`, or the browser treats it as a
 * different cookie and leaves the original behind — both `setSessionCookie`
 * and `clearSessionCookie` read from this one shared object so they can
 * never drift apart.
 */
export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
};

/** Call only from a Server Action or Route Handler. */
export async function setSessionCookie(payload: SessionPayload, rememberMe = false) {
  const maxAge = rememberMe ? SESSION_MAX_AGE_SECONDS : SHORT_SESSION_MAX_AGE_SECONDS;
  const token = await createSessionToken(payload, maxAge);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, { ...cookieOptions, maxAge });
}

/** Call only from a Server Action or Route Handler. */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE_NAME, ...cookieOptions });
}

/** Safe to call from Server Components (read-only). */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
