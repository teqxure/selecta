import "server-only";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export function listStaffRoles() {
  return db.staffRole.findMany({
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: [{ isSystemDefined: "desc" }, { name: "asc" }],
  });
}

export function getStaffRole(id: string) {
  return db.staffRole.findUnique({ where: { id }, include: { permissions: true } });
}

export interface StaffRoleInput {
  name: string;
  description?: string | null;
  permissions: string[];
  isSystemDefined?: boolean;
}

export async function createStaffRole(adminId: string, input: StaffRoleInput) {
  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return db.$transaction(async (tx) => {
    const role = await tx.staffRole.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        isSystemDefined: input.isSystemDefined ?? false,
        createdById: adminId,
        permissions: { create: input.permissions.map((permission) => ({ permission })) },
      },
      include: { permissions: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "STAFF_ROLE_CREATED",
        entityType: "StaffRole",
        entityId: role.id,
        metadata: { name: input.name, permissions: input.permissions } as object,
      },
    });

    return role;
  });
}

/** Replaces the role's whole permission set — same "replace the whole array" convention as admin-management.service.ts's updateAdminPermissions. */
export async function updateStaffRole(adminId: string, id: string, input: StaffRoleInput) {
  return db.$transaction(async (tx) => {
    const before = await tx.staffRole.findUnique({ where: { id }, include: { permissions: true } });
    if (!before) throw new ValidationError("Role not found");

    await tx.staffRolePermission.deleteMany({ where: { roleId: id } });
    const role = await tx.staffRole.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description ?? null,
        permissions: { create: input.permissions.map((permission) => ({ permission })) },
      },
      include: { permissions: true },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "STAFF_ROLE_UPDATED",
        entityType: "StaffRole",
        entityId: id,
        metadata: {
          before: { name: before.name, permissions: before.permissions.map((p) => p.permission) },
          after: { name: input.name, permissions: input.permissions },
        } as object,
      },
    });

    return role;
  });
}

export async function deleteStaffRole(adminId: string, id: string) {
  const assignedCount = await db.user.count({ where: { staffRoleId: id } });
  if (assignedCount > 0) {
    throw new ValidationError(`${assignedCount} admin${assignedCount === 1 ? " is" : "s are"} still assigned this role — reassign them first`);
  }

  return db.$transaction(async (tx) => {
    const role = await tx.staffRole.delete({ where: { id } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "STAFF_ROLE_DELETED", entityType: "StaffRole", entityId: id, metadata: { name: role.name } as object },
    });
    return role;
  });
}

export async function assignStaffRoleToUser(adminId: string, userId: string, staffRoleId: string | null) {
  return db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { staffRoleId: true } });
    const user = await tx.user.update({ where: { id: userId }, data: { staffRoleId } });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "STAFF_ROLE_ASSIGNED",
        entityType: "User",
        entityId: userId,
        metadata: { before: before.staffRoleId, after: staffRoleId } as object,
      },
    });

    return user;
  });
}
