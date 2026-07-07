"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@/lib/constants/roles";
import { createAdminSchema } from "@/lib/validators/admin-management";
import { createAdmin, updateAdminPermissions, setAdminStatus } from "@/services/admin/admin-management.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import type { AdminPermission } from "@/lib/constants/permissions";

export interface CreateAdminActionState {
  error?: string;
}

export async function createAdminAction(_prevState: CreateAdminActionState, formData: FormData): Promise<CreateAdminActionState> {
  const session = await requireRole(Role.SUPER_ADMIN);

  const parsed = createAdminSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    permissions: formData.getAll("permissions"),
  });
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  try {
    const { ipAddress } = await getRequestMeta();
    await createAdmin(session.userId, parsed.data, ipAddress);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.admins);
  return {};
}

export async function updateAdminPermissionsAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const targetAdminId = String(formData.get("adminId"));
  const permissions = formData.getAll("permissions") as AdminPermission[];

  const { ipAddress } = await getRequestMeta();
  await updateAdminPermissions(session.userId, targetAdminId, permissions, ipAddress);

  revalidatePath(ROUTES.admin.adminDetail(targetAdminId));
  revalidatePath(ROUTES.admin.admins);
}

export async function disableAdminAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const targetAdminId = String(formData.get("adminId"));

  const { ipAddress } = await getRequestMeta();
  await setAdminStatus(session.userId, targetAdminId, UserStatus.SUSPENDED, ipAddress);

  revalidatePath(ROUTES.admin.adminDetail(targetAdminId));
  revalidatePath(ROUTES.admin.admins);
}

export async function reinstateAdminAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const targetAdminId = String(formData.get("adminId"));

  const { ipAddress } = await getRequestMeta();
  await setAdminStatus(session.userId, targetAdminId, UserStatus.ACTIVE, ipAddress);

  revalidatePath(ROUTES.admin.adminDetail(targetAdminId));
  revalidatePath(ROUTES.admin.admins);
}
