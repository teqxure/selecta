import "server-only";
import { getSession } from "@/lib/auth/session";
import { currentUser } from "@/lib/auth/current-user";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";

/**
 * Defense in depth: `proxy.ts` blocks unauthenticated requests to protected
 * route prefixes, but Server Actions can be called directly, so every
 * mutation must also re-check the session here.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new AuthError();
  return session;
}

export async function requireRole(...allowed: Role[]) {
  const session = await requireAuth();
  if (!allowed.includes(session.role)) throw new ForbiddenError();
  return session;
}

/**
 * Stricter than `requireAuth`: re-reads the user from the database so a
 * session issued before a suspension/ban is rejected immediately rather
 * than waiting for the JWT to expire. Use this for sensitive mutations
 * (onboarding submission, profile changes, admin actions) — `requireRole`
 * remains the lightweight, cookie-only check for cheap reads.
 */
export async function requireActiveUser() {
  const user = await currentUser();
  if (!user) throw new AuthError();
  if (user.status !== UserStatus.ACTIVE) {
    throw new ForbiddenError(
      user.status === UserStatus.SUSPENDED
        ? "Your account has been suspended"
        : user.status === UserStatus.BANNED
          ? "Your account has been banned"
          : "Your account is inactive",
    );
  }
  return user;
}

export async function requireActiveRole(...allowed: Role[]) {
  const user = await requireActiveUser();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}
