import "server-only";
import { getSession } from "@/lib/auth/session";
import { AuthError, ForbiddenError } from "@/lib/errors";
import { Role } from "@/lib/constants/roles";

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
