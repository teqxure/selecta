import "server-only";
import { db } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth/session";
import { SESSION_MAX_AGE_SECONDS, SHORT_SESSION_MAX_AGE_SECONDS } from "@/lib/constants/app";
import { assertActorMayManageTarget } from "@/services/users/account-guards";
import type { Role } from "@/lib/constants/roles";

export interface EstablishSessionOptions {
  ipAddress?: string;
  userAgent?: string;
  rememberMe?: boolean;
}

/**
 * The one place every login-type flow (password login, register, Google
 * callback) goes through — creates the DB `Session` row the JWT's `sid`
 * claim points at, then sets the cookie. Centralizing this means every
 * sign-in method is trackable/revocable the same way, with no flow able to
 * accidentally skip it.
 */
export async function establishSession(userId: string, role: Role, options: EstablishSessionOptions = {}) {
  const maxAge = options.rememberMe ? SESSION_MAX_AGE_SECONDS : SHORT_SESSION_MAX_AGE_SECONDS;

  const session = await db.session.create({
    data: {
      userId,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      expiresAt: new Date(Date.now() + maxAge * 1000),
    },
  });

  await setSessionCookie({ userId, role, sessionId: session.id }, options.rememberMe ?? false);
  return session;
}

/** Newest first — capped at 20, since this is an admin-facing "recent sessions" view, not a full archive. */
export function listSessionsForUser(userId: string) {
  return db.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** Ownership-scoped: `{ id, userId }` in the `where` clause means revoking someone else's session by guessing an id is a no-op, not a leak. */
export async function revokeSession(actorId: string, targetUserId: string, sessionId: string, ipAddress?: string) {
  // A user revoking their own session (e.g. "log out this device") is
  // always fine and doesn't go through the hierarchy guard, which forbids
  // self-targeting entirely — that guard exists for admin-initiated
  // actions on OTHER accounts, not a user managing their own sessions.
  if (actorId !== targetUserId) await assertActorMayManageTarget(actorId, targetUserId);

  const { count } = await db.session.updateMany({
    where: { id: sessionId, userId: targetUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return;

  await db.auditLog.create({
    data: { actorId, action: "SESSION_REVOKED", entityType: "User", entityId: targetUserId, metadata: { sessionId }, ipAddress },
  });
}

export async function revokeAllSessionsForUser(actorId: string, targetUserId: string, ipAddress?: string) {
  if (actorId !== targetUserId) await assertActorMayManageTarget(actorId, targetUserId);

  const { count } = await db.session.updateMany({
    where: { userId: targetUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      actorId,
      action: "ALL_SESSIONS_REVOKED",
      entityType: "User",
      entityId: targetUserId,
      metadata: { revokedCount: count },
      ipAddress,
    },
  });
}
