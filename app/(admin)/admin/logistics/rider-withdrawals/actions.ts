"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveRiderWithdrawal, rejectRiderWithdrawal, markRiderWithdrawalProcessing } from "@/services/logistics/rider-withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";

export async function markRiderWithdrawalProcessingAction(formData: FormData) {
  const admin = await requirePermission("MANAGE_LOGISTICS");
  await markRiderWithdrawalProcessing(admin.id, String(formData.get("id")));
  revalidatePath(ROUTES.admin.logisticsRiderWithdrawals);
}

export async function approveRiderWithdrawalAction(formData: FormData) {
  const admin = await requirePermission("MANAGE_LOGISTICS");
  const notes = String(formData.get("notes") || "") || undefined;
  await approveRiderWithdrawal(admin.id, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.logisticsRiderWithdrawals);
}

export async function rejectRiderWithdrawalAction(formData: FormData) {
  const admin = await requirePermission("MANAGE_LOGISTICS");
  const notes = String(formData.get("notes") || "") || undefined;
  await rejectRiderWithdrawal(admin.id, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.logisticsRiderWithdrawals);
}
