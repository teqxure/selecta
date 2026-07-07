"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { confirmDeliveryAsBuyer } from "@/services/orders/order.service";
import { fileDispute } from "@/services/disputes/dispute.service";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import type { DisputeType } from "@/generated/prisma/enums";

export async function confirmDeliveryAction(formData: FormData) {
  const session = await requireAuth();
  const orderId = String(formData.get("orderId"));

  await confirmDeliveryAsBuyer(orderId, session.userId);
  revalidatePath(ROUTES.order(orderId));
}

export interface FileDisputeState {
  error?: string;
  success?: boolean;
}

export async function fileDisputeAction(_prevState: FileDisputeState, formData: FormData): Promise<FileDisputeState> {
  const session = await requireAuth();
  const orderId = String(formData.get("orderId"));

  try {
    await fileDispute(session.userId, {
      orderId,
      sellerId: String(formData.get("sellerId")),
      type: String(formData.get("type")) as DisputeType,
      description: String(formData.get("description") || "").trim(),
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.order(orderId));
  return { success: true };
}
