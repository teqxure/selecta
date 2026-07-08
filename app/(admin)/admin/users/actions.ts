"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { changeUserRole } from "@/services/users/user.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Role changes are Super-Admin-only, full stop — not gated by the
 * "users.manage" permission an ADMIN can hold for this same page. Handing
 * out or removing SUPER_ADMIN (or any role) must never be delegable to an
 * ADMIN account, mirroring the same boundary admin-management.service.ts
 * already draws around ADMIN accounts specifically.
 */
export async function changeUserRoleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const targetUserId = String(formData.get("userId"));
  const newRole = String(formData.get("role")) as Role;
  if (!Object.values(Role).includes(newRole)) return;

  const { ipAddress } = await getRequestMeta();
  await changeUserRole(session.userId, targetUserId, newRole, ipAddress);

  revalidatePath(ROUTES.admin.users);
}
