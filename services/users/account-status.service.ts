import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createNotification } from "@/services/notifications/notification.service";
import { revokeAllSessionsForUser } from "@/services/users/session.service";
import { assertActorMayManageTarget, assertLastActiveSuperAdminSurvives } from "@/services/users/account-guards";
import { ValidationError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";

const STATUS_NOTIFICATION_COPY: Record<UserStatus, { title: string; message: string }> = {
  ACTIVE: { title: "Your account is active again", message: "Your Selecta account has been reactivated. Welcome back!" },
  INACTIVE: {
    title: "Your account has been deactivated",
    message: "Your Selecta account has been deactivated. Contact support if you believe this is a mistake.",
  },
  SUSPENDED: {
    title: "Your account has been suspended",
    message: "Your Selecta account has been suspended. Contact support for more information.",
  },
  BANNED: {
    title: "Your account has been banned",
    message: "Your Selecta account has been banned from the Selecta platform.",
  },
};

/**
 * The account-lifecycle lever: ACTIVE / SUSPENDED / BANNED / (INACTIVE,
 * shown to admins as "Deactivated" — see lib/constants/roles.ts). Every
 * transition away from ACTIVE force-logs-out the account in the same
 * transaction as the status write, so "existing sessions revoked" isn't a
 * separate step an admin can forget. Gated the same way as every other
 * operational-control action this phase: never self-targetable, and an
 * ADMIN can never reach an ADMIN or SUPER_ADMIN account.
 */
export async function changeUserStatus(actorId: string, targetUserId: string, newStatus: UserStatus, ipAddress?: string) {
  await assertActorMayManageTarget(actorId, targetUserId);

  const target = await db.user.findUniqueOrThrow({ where: { id: targetUserId } });
  if (target.status === newStatus) return target;

  if (target.role === Role.SUPER_ADMIN && newStatus !== UserStatus.ACTIVE) {
    await assertLastActiveSuperAdminSurvives(targetUserId);
  }

  const previousStatus = target.status;

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: targetUserId }, data: { status: newStatus } });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "USER_STATUS_CHANGED",
        entityType: "User",
        entityId: targetUserId,
        metadata: { fromStatus: previousStatus, toStatus: newStatus },
        ipAddress,
      },
    });

    return user;
  });

  if (newStatus !== UserStatus.ACTIVE) {
    await revokeAllSessionsForUser(actorId, targetUserId, ipAddress);
  }

  const copy = STATUS_NOTIFICATION_COPY[newStatus];
  await createNotification(targetUserId, "SYSTEM", copy.title, copy.message, { fromStatus: previousStatus, toStatus: newStatus });

  return updated;
}

/**
 * Sets a new password an admin/support agent relays to the account holder
 * out-of-band (no email infrastructure is wired yet to send a reset link —
 * see the Phase 1 audit). Google-only accounts (no `passwordHash`) can't
 * use this; they sign in exclusively via Google. Revokes every existing
 * session, same reasoning as a status change: a credential reset without a
 * forced logout would leave already-open sessions valid on the old trust
 * basis.
 */
export async function forcePasswordReset(actorId: string, targetUserId: string, newPassword: string, ipAddress?: string) {
  await assertActorMayManageTarget(actorId, targetUserId);

  const target = await db.user.findUniqueOrThrow({ where: { id: targetUserId } });
  if (!target.passwordHash) {
    throw new ValidationError("This account signs in with Google only and has no password to reset");
  }

  const passwordHash = await hashPassword(newPassword);

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: targetUserId }, data: { passwordHash } });
    await tx.auditLog.create({
      data: { actorId, action: "PASSWORD_FORCE_RESET", entityType: "User", entityId: targetUserId, ipAddress },
    });
  });

  await revokeAllSessionsForUser(actorId, targetUserId, ipAddress);

  await createNotification(
    targetUserId,
    "SYSTEM",
    "Your password was reset",
    "Selecta support reset your password. If you didn't request this, contact support immediately.",
  );
}
