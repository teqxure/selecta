"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { confirmDeliveryAsBuyer, getOrderDetailForBuyer } from "@/services/orders/order.service";
import { fileDispute } from "@/services/disputes/dispute.service";
import { createReview } from "@/services/products/review.service";
import { getOrCreateConversation } from "@/services/messaging/conversation.service";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import type { DisputeType } from "@/generated/prisma/enums";

export async function startOrderSupportConversationAction(orderId: string, sellerProfileId: string) {
  const session = await requireAuth();
  await getOrderDetailForBuyer(orderId, session.userId); // ownership check
  const conversation = await getOrCreateConversation(session.userId, sellerProfileId, { type: "ORDER_SUPPORT", orderId });
  redirect(ROUTES.message(conversation.id));
}

export async function confirmDeliveryAction(formData: FormData) {
  const session = await requireAuth();
  const orderId = String(formData.get("orderId"));

  await confirmDeliveryAsBuyer(orderId, session.userId);
  revalidatePath(ROUTES.order(orderId));
}

export interface FileDisputeState {
  error?: string;
  success?: boolean;
  conversationId?: string;
}

export async function fileDisputeAction(_prevState: FileDisputeState, formData: FormData): Promise<FileDisputeState> {
  const session = await requireAuth();
  const orderId = String(formData.get("orderId"));

  let conversationId: string;
  try {
    const dispute = await fileDispute(session.userId, {
      orderId,
      sellerId: String(formData.get("sellerId")),
      type: String(formData.get("type")) as DisputeType,
      description: String(formData.get("description") || "").trim(),
    });
    conversationId = dispute.conversationId;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.order(orderId));
  return { success: true, conversationId };
}

export interface CreateReviewState {
  error?: string;
}

export async function createReviewAction(orderId: string, _prevState: CreateReviewState, formData: FormData): Promise<CreateReviewState> {
  const session = await requireAuth();

  try {
    await createReview(session.userId, {
      orderItemId: String(formData.get("orderItemId")),
      rating: Number(formData.get("rating")),
      comment: String(formData.get("comment") || "").trim() || undefined,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.order(orderId));
  return {};
}
