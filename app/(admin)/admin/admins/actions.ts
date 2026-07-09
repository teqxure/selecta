"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@/lib/constants/roles";
import { createAdminSchema, updateAdminPermissionsSchema } from "@/lib/validators/admin-management";
import { createAdmin, updateAdminPermissions, setAdminStatus } from "@/services/admin/admin-management.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { formatZodError, isAppError, ValidationError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

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
  if (!parsed.success) return { error: formatZodError(parsed.error) };

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

  // Never trust the submitted permission strings as-is — only the fixed,
  // enumerated ADMIN_PERMISSIONS set may be granted here. Without this, a
  // crafted request (e.g. "*") could hand an ADMIN account implicit
  // Super-Admin-equivalent authority (see hasPermission()'s wildcard check)
  // without the account ever appearing as SUPER_ADMIN anywhere.
  const parsed = updateAdminPermissionsSchema.safeParse({ permissions: formData.getAll("permissions") });
  if (!parsed.success) throw new ValidationError("Invalid permissions selection");

  const { ipAddress } = await getRequestMeta();
  await updateAdminPermissions(session.userId, targetAdminId, parsed.data.permissions, ipAddress);

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
