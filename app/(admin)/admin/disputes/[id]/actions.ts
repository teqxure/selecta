"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import {
  markDisputeUnderReview,
  resolveDisputeWithRefund,
  resolveDisputeWithRelease,
  closeDisputeWithoutAction,
} from "@/services/disputes/dispute.service";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

export interface DisputeActionState {
  error?: string;
}

export async function markUnderReviewAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const disputeId = String(formData.get("disputeId"));
  await markDisputeUnderReview(session.userId, disputeId);
  revalidatePath(ROUTES.admin.dispute(disputeId));
}

export async function resolveWithRefundAction(_prevState: DisputeActionState, formData: FormData): Promise<DisputeActionState> {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const disputeId = String(formData.get("disputeId"));
  const note = String(formData.get("resolution") || "").trim();

  try {
    await resolveDisputeWithRefund(session.userId, disputeId, note);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.dispute(disputeId));
  return {};
}

export async function resolveWithReleaseAction(_prevState: DisputeActionState, formData: FormData): Promise<DisputeActionState> {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const disputeId = String(formData.get("disputeId"));
  const note = String(formData.get("resolution") || "").trim();

  try {
    await resolveDisputeWithRelease(session.userId, disputeId, note);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.dispute(disputeId));
  return {};
}

export async function closeWithoutActionAction(
  _prevState: DisputeActionState,
  formData: FormData,
): Promise<DisputeActionState> {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const disputeId = String(formData.get("disputeId"));
  const note = String(formData.get("resolution") || "").trim();

  try {
    await closeDisputeWithoutAction(session.userId, disputeId, note);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.dispute(disputeId));
  return {};
}
