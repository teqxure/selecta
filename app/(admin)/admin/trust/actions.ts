"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireRole } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@/lib/constants/roles";
import { warnUser, restrictMessaging, liftMessagingRestriction } from "@/services/messaging/trust-moderation.service";
import { changeUserStatus } from "@/services/users/account-status.service";
import { ROUTES } from "@/lib/constants/routes";

export async function warnUserAction(formData: FormData) {
  const admin = await requirePermission("support.messages");
  const targetUserId = String(formData.get("userId"));
  await warnUser(admin.id, targetUserId, String(formData.get("note") || "") || undefined);
  revalidatePath(ROUTES.admin.trustDashboard);
}

export async function restrictMessagingAction(formData: FormData) {
  const admin = await requirePermission("support.messages");
  const targetUserId = String(formData.get("userId"));
  await restrictMessaging(admin.id, targetUserId);
  revalidatePath(ROUTES.admin.trustDashboard);
}

export async function liftMessagingRestrictionAction(formData: FormData) {
  const admin = await requirePermission("support.messages");
  const targetUserId = String(formData.get("userId"));
  await liftMessagingRestriction(admin.id, targetUserId);
  revalidatePath(ROUTES.admin.trustDashboard);
}

/** Suspension is the heaviest lever — kept Super-Admin only, same boundary as the rest of the account-management system. */
export async function suspendUserAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const targetUserId = String(formData.get("userId"));
  await changeUserStatus(session.userId, targetUserId, UserStatus.SUSPENDED);
  revalidatePath(ROUTES.admin.trustDashboard);
}
