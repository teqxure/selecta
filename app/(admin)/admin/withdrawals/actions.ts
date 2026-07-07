"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveWithdrawal, rejectWithdrawal, markWithdrawalProcessing } from "@/services/payments/withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";

export async function markWithdrawalProcessingAction(formData: FormData) {
  const admin = await requirePermission("payouts.manage");
  await markWithdrawalProcessing(admin.id, String(formData.get("id")));
  revalidatePath(ROUTES.admin.withdrawals);
}

export async function approveWithdrawalAction(formData: FormData) {
  const admin = await requirePermission("payouts.manage");
  const notes = String(formData.get("notes") || "") || undefined;
  await approveWithdrawal(admin.id, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.withdrawals);
}

export async function rejectWithdrawalAction(formData: FormData) {
  const admin = await requirePermission("payouts.manage");
  const notes = String(formData.get("notes") || "") || undefined;
  await rejectWithdrawal(admin.id, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.withdrawals);
}
