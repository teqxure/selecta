"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { approveWithdrawal, rejectWithdrawal, markWithdrawalProcessing } from "@/services/payments/withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";

export async function markWithdrawalProcessingAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  await markWithdrawalProcessing(session.userId, String(formData.get("id")));
  revalidatePath(ROUTES.admin.withdrawals);
}

export async function approveWithdrawalAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const notes = String(formData.get("notes") || "") || undefined;
  await approveWithdrawal(session.userId, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.withdrawals);
}

export async function rejectWithdrawalAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const notes = String(formData.get("notes") || "") || undefined;
  await rejectWithdrawal(session.userId, String(formData.get("id")), notes);
  revalidatePath(ROUTES.admin.withdrawals);
}
