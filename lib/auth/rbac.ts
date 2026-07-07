import "server-only";
import { currentUser } from "@/lib/auth/current-user";
import { AuthError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * SECURITY: every one of these re-reads the user from the database (via
 * `currentUser()`, which is request-deduped through React's `cache()`, so
 * this costs at most one extra query per request, not per call). A JWT is
 * a bearer token, not a source of truth — trusting its baked-in `role`
 * without checking the current DB row is exactly how a suspended/demoted/
 * banned user keeps working access on an old-but-unexpired session. That
 * used to be the case here (`requireRole`/`requireAuth` only checked the
 * cookie); it isn't anymore. `proxy.ts` still does a cheap cookie-only
 * check as a fast, optimistic first gate for routing — these functions are
 * the authoritative check every Server Action/Route Handler must call.
 */
export async function requireAuth() {
  const user = await requireActiveUser();
  return { userId: user.id, role: user.role };
}

export async function requireRole(...allowed: Role[]) {
  const user = await requireActiveRole(...allowed);
  return { userId: user.id, role: user.role };
}

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

/**
 * Permission-gated access — the fine-grained layer on top of role checks.
 * SUPER_ADMIN implicitly holds every permission ("*"). ADMIN only passes
 * for permissions granted individually via `/admin/admins`. Returns the
 * full user row since callers of this typically need more than userId/role
 * (e.g. to log which admin acted).
 */
export async function requirePermission(...permissions: string[]) {
  const user = await requireActiveUser();
  if (!permissions.some((permission) => hasPermission(user, permission))) {
    throw new ForbiddenError();
  }
  return user;
}

/**
 * Formalizes the "ownership check IS the query" pattern used throughout
 * the service layer (`where: { id, sellerId }` etc.) — fetch with the
 * scoping already applied, and treat a null result as "not found," not as
 * "found but not yours." Never fetch by bare id and compare after the
 * fact — that leaks existence (timing, or a distinguishable error) even if
 * you correctly deny access.
 */
export async function requireOwnership<T>(fetchScopedToOwner: () => Promise<T | null>, resourceName = "Resource"): Promise<T> {
  const resource = await fetchScopedToOwner();
  if (!resource) throw new NotFoundError(resourceName);
  return resource;
}
