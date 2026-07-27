"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createStaffRole, updateStaffRole, deleteStaffRole } from "@/services/platform/staff-role.service";
import { ROUTES } from "@/lib/constants/routes";

function readRoleInput(formData: FormData) {
  return {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "") || null,
    permissions: formData.getAll("permissions").map(String),
  };
}

export async function createStaffRoleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  await createStaffRole(session.userId, readRoleInput(formData));
  revalidatePath(ROUTES.admin.roles);
}

export async function updateStaffRoleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  await updateStaffRole(session.userId, id, readRoleInput(formData));
  revalidatePath(ROUTES.admin.roles);
  revalidatePath(ROUTES.admin.role(id));
}

export async function deleteStaffRoleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  await deleteStaffRole(session.userId, id);
  revalidatePath(ROUTES.admin.roles);
}
