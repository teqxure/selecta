"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requirePermission } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@/lib/constants/roles";
import { changeUserRole } from "@/services/users/user.service";
import { changeUserStatus, forcePasswordReset } from "@/services/users/account-status.service";
import { revokeSession, revokeAllSessionsForUser } from "@/services/users/session.service";
import { passwordSchema } from "@/lib/validators/common";
import { getRequestMeta } from "@/lib/security/request-meta";
import { isAppError } from "@/lib/errors";
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
  revalidatePath(ROUTES.admin.user(targetUserId));
}

/**
 * Status changes (suspend/ban/deactivate/reactivate) are delegable via the
 * "users.manage" permission (its own label already says "change status") —
 * unlike role changes, which stay Super-Admin-only. The service layer
 * still blocks an ADMIN from reaching an ADMIN or SUPER_ADMIN target.
 */
export async function changeUserStatusAction(formData: FormData) {
  const session = await requirePermission("users.manage");

  const targetUserId = String(formData.get("userId"));
  const newStatus = String(formData.get("status")) as UserStatus;
  if (!Object.values(UserStatus).includes(newStatus)) return;

  const { ipAddress } = await getRequestMeta();
  await changeUserStatus(session.id, targetUserId, newStatus, ipAddress);

  revalidatePath(ROUTES.admin.users);
  revalidatePath(ROUTES.admin.user(targetUserId));
}

export async function terminateSessionAction(formData: FormData) {
  const session = await requirePermission("users.manage");

  const targetUserId = String(formData.get("userId"));
  const sessionId = String(formData.get("sessionId"));

  const { ipAddress } = await getRequestMeta();
  await revokeSession(session.id, targetUserId, sessionId, ipAddress);

  revalidatePath(ROUTES.admin.user(targetUserId));
}

export async function forceLogoutAllAction(formData: FormData) {
  const session = await requirePermission("users.manage");

  const targetUserId = String(formData.get("userId"));

  const { ipAddress } = await getRequestMeta();
  await revokeAllSessionsForUser(session.id, targetUserId, ipAddress);

  revalidatePath(ROUTES.admin.user(targetUserId));
}

export interface ForcePasswordResetActionState {
  error?: string;
  success?: boolean;
}

export async function forcePasswordResetAction(
  _prevState: ForcePasswordResetActionState,
  formData: FormData,
): Promise<ForcePasswordResetActionState> {
  const session = await requirePermission("users.manage");

  const targetUserId = String(formData.get("userId"));
  const newPassword = String(formData.get("newPassword"));

  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid password" };

  try {
    const { ipAddress } = await getRequestMeta();
    await forcePasswordReset(session.id, targetUserId, parsed.data, ipAddress);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.user(targetUserId));
  return { success: true };
}
