"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { NotFoundError, isAppError } from "@/lib/errors";
import { recordContactSeller } from "@/services/products/search.service";
import { getOrCreateConversation } from "@/services/messaging/conversation.service";
import { makeOffer } from "@/services/messaging/offer.service";
import { checkConversationRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

/**
 * Replaces the old "reveal seller phone number" flow — every buyer-seller
 * contact now goes through Selecta's own messaging so it's never a raw
 * phone number/WhatsApp deep link handed out client-side (see Phase 1/4 of
 * the trust & communication build).
 */
export async function startProductConversationAction(productId: string) {
  const session = await requireAuth();
  if (!(await checkConversationRateLimit(session.userId)).allowed) throw new RateLimitError();

  const product = await db.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
  if (!product) throw new NotFoundError("Product");

  await recordContactSeller(productId, session.userId);
  const conversation = await getOrCreateConversation(session.userId, product.sellerId, { type: "PRODUCT_INQUIRY", productId });
  redirect(ROUTES.message(conversation.id));
}

export interface MakeOfferState {
  error?: string;
}

export async function makeOfferAction(productId: string, _prevState: MakeOfferState, formData: FormData): Promise<MakeOfferState> {
  const session = await requireAuth();
  if (!(await checkConversationRateLimit(session.userId)).allowed) throw new RateLimitError();

  const product = await db.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
  if (!product) throw new NotFoundError("Product");

  const amount = Number(formData.get("amount"));

  let conversationId: string;
  try {
    const conversation = await getOrCreateConversation(session.userId, product.sellerId, { type: "PRODUCT_INQUIRY", productId });
    await makeOffer(conversation.id, session.userId, productId, amount);
    conversationId = conversation.id;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.message(conversationId));
}
