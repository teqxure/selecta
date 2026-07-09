import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { notify } from "@/services/notifications/notify.service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";
import type { CreateAdminInput } from "@/lib/validators/admin-management";

/**
 * Every function here is reachable only from /admin/admins, itself gated
 * to SUPER_ADMIN (see rbac's requireRole/requirePermission — ADMIN has no
 * permission string that unlocks this page, by design: managing other
 * admins' access is Super Admin's exclusive power, never delegable).
 */

async function assertTargetIsManageableAdmin(targetUserId: string) {
  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("Admin");
  // Never allow this surface to touch a SUPER_ADMIN account — not even to
  // view/suspend it. That account's permissions are implicit and immune
  // to modification through the admin-management UI, by design.
  if (target.role !== Role.ADMIN) throw new ForbiddenError("This account is not a manageable admin");
  return target;
}

export function listAdmins() {
  return db.user.findMany({
    where: { role: Role.ADMIN },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAdmin(superAdminId: string, input: CreateAdminInput, ipAddress?: string) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);

  return db.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.ADMIN,
        permissions: input.permissions,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: superAdminId,
        action: "ADMIN_CREATED",
        entityType: "User",
        entityId: admin.id,
        metadata: { email: admin.email, permissions: input.permissions } as object,
        ipAddress,
      },
    });

    return admin;
  });
}

export async function updateAdminPermissions(
  superAdminId: string,
  targetAdminId: string,
  permissions: string[],
  ipAddress?: string,
) {
  await assertTargetIsManageableAdmin(targetAdminId);

  return db.$transaction(async (tx) => {
    const admin = await tx.user.update({ where: { id: targetAdminId }, data: { permissions } });

    await tx.auditLog.create({
      data: {
        actorId: superAdminId,
        action: "ADMIN_PERMISSIONS_UPDATED",
        entityType: "User",
        entityId: targetAdminId,
        metadata: { permissions } as object,
        ipAddress,
      },
    });

    return admin;
  }).then(async (admin) => {
    const message = "Selecta updated what you have access to. Refresh the page to see your current permissions.";
    await notify({
      event: "SECURITY_ALERT",
      userId: admin.id,
      title: "Your admin permissions changed",
      message,
      emailVariables: { message },
    });
    return admin;
  });
}

export async function setAdminStatus(
  superAdminId: string,
  targetAdminId: string,
  status: typeof UserStatus.ACTIVE | typeof UserStatus.SUSPENDED,
  ipAddress?: string,
) {
  await assertTargetIsManageableAdmin(targetAdminId);

  return db.$transaction(async (tx) => {
    const admin = await tx.user.update({ where: { id: targetAdminId }, data: { status } });

    await tx.auditLog.create({
      data: {
        actorId: superAdminId,
        action: status === UserStatus.SUSPENDED ? "ADMIN_DISABLED" : "ADMIN_REINSTATED",
        entityType: "User",
        entityId: targetAdminId,
        ipAddress,
      },
    });

    return admin;
  });
}

/** Recent audit-log entries this admin has personally performed — the "view admin activity" requirement. */
export function getAdminActivity(adminId: string, take = 50) {
  return db.auditLog.findMany({
    where: { actorId: adminId },
    orderBy: { createdAt: "desc" },
    take,
  });
}
