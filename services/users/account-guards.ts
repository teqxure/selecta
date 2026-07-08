import "server-only";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";

/**
 * Shared hierarchy guard for every operational-control action on this
 * phase (sessions, status, password reset) — mirrors the same two rules
 * `changeUserRole` already enforces for role changes: an actor can never
 * act on their own account through these surfaces (no accidental
 * self-lockout), and an ADMIN can never act on an ADMIN or SUPER_ADMIN
 * account (that tier is Super Admin's exclusive territory, same boundary
 * admin-management.service.ts already draws around ADMIN accounts).
 */
export async function assertActorMayManageTarget(actorId: string, targetUserId: string) {
  if (actorId === targetUserId) throw new ForbiddenError("You cannot perform this action on your own account");

  const [actor, target] = await Promise.all([
    db.user.findUnique({ where: { id: actorId }, select: { role: true } }),
    db.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
  ]);

  if (!target) throw new ForbiddenError("Account not found");
  if ((target.role === Role.ADMIN || target.role === Role.SUPER_ADMIN) && actor?.role !== Role.SUPER_ADMIN) {
    throw new ForbiddenError("Only Super Admin can manage an Admin or Super Admin account");
  }
}

/** Prevents taking the last active Super Admin out of active duty (status change, not just role change). */
export async function assertLastActiveSuperAdminSurvives(targetUserId: string) {
  const remainingSuperAdmins = await db.user.count({
    where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, id: { not: targetUserId } },
  });
  if (remainingSuperAdmins === 0) {
    throw new ForbiddenError("At least one active Super Admin must remain");
  }
}
