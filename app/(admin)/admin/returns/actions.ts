"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveReturn, rejectReturn, markReturnItemReceived, resolveReturn } from "@/services/returns/return.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";
import type { ReturnOutcome } from "@/generated/prisma/enums";

export interface ReturnActionState {
  error?: string;
}

export async function approveReturnAction(formData: FormData) {
  const session = await requirePermission("APPROVE_REFUNDS");
  const returnId = String(formData.get("returnId"));
  const notes = String(formData.get("notes") || "").trim() || undefined;

  await approveReturn(session.id, returnId, notes);
  revalidatePath(ROUTES.admin.returns);
  revalidatePath(ROUTES.admin.return(returnId));
}

export async function rejectReturnAction(formData: FormData) {
  const session = await requirePermission("APPROVE_REFUNDS");
  const returnId = String(formData.get("returnId"));
  const reason = String(formData.get("reason") || "").trim();

  await rejectReturn(session.id, returnId, reason);
  revalidatePath(ROUTES.admin.returns);
  revalidatePath(ROUTES.admin.return(returnId));
}

export async function markReturnItemReceivedAction(formData: FormData) {
  const session = await requirePermission("APPROVE_REFUNDS");
  const returnId = String(formData.get("returnId"));

  await markReturnItemReceived(session.id, returnId);
  revalidatePath(ROUTES.admin.return(returnId));
}

export async function resolveReturnAction(_prevState: ReturnActionState, formData: FormData): Promise<ReturnActionState> {
  const session = await requirePermission("APPROVE_REFUNDS");
  const returnId = String(formData.get("returnId"));
  const outcome = String(formData.get("outcome")) as ReturnOutcome;
  const refundAmount = String(formData.get("refundAmount") || "");
  const notes = String(formData.get("notes") || "").trim() || undefined;

  try {
    await resolveReturn(session.id, returnId, {
      outcome,
      refundAmount: refundAmount ? Number(refundAmount) : undefined,
      notes,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.returns);
  revalidatePath(ROUTES.admin.return(returnId));
  return {};
}
