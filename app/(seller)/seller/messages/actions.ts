"use server";

import { revalidatePath } from "next/cache";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { sendMessage, setConversationArchived, reportConversation } from "@/services/messaging/conversation.service";
import { acceptOffer, rejectOffer, counterOffer } from "@/services/messaging/offer.service";
import { ROUTES } from "@/lib/constants/routes";
import { checkMessageRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError, isAppError } from "@/lib/errors";

export interface SendMessageState {
  error?: string;
  warning?: string;
}

export async function sendSellerMessageAction(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireActiveRole(Role.SELLER);
  if (!(await checkMessageRateLimit(user.id)).allowed) throw new RateLimitError();

  try {
    const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
    const { warning } = await sendMessage(conversationId, user.id, String(formData.get("body") ?? ""), imageUrl);
    revalidatePath(ROUTES.seller.message(conversationId));
    return { warning: warning ?? undefined };
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
}

export async function archiveSellerConversationAction(conversationId: string) {
  const user = await requireActiveRole(Role.SELLER);
  await setConversationArchived(conversationId, user.id, true);
  revalidatePath(ROUTES.seller.messages);
}

export async function reportSellerConversationAction(conversationId: string, formData: FormData) {
  const user = await requireActiveRole(Role.SELLER);
  await reportConversation(conversationId, user.id, String(formData.get("reason") ?? ""));
  revalidatePath(ROUTES.seller.message(conversationId));
}

export interface OfferActionState {
  error?: string;
}

export async function acceptOfferAction(conversationId: string, offerId: string, _prevState: OfferActionState): Promise<OfferActionState> {
  const user = await requireActiveRole(Role.SELLER);
  try {
    await acceptOffer(offerId, user.id);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath(ROUTES.seller.message(conversationId));
  return {};
}

export async function rejectOfferAction(conversationId: string, offerId: string, _prevState: OfferActionState): Promise<OfferActionState> {
  const user = await requireActiveRole(Role.SELLER);
  try {
    await rejectOffer(offerId, user.id);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath(ROUTES.seller.message(conversationId));
  return {};
}

export async function counterOfferAction(
  conversationId: string,
  offerId: string,
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const user = await requireActiveRole(Role.SELLER);
  try {
    await counterOffer(offerId, user.id, Number(formData.get("amount")));
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
  revalidatePath(ROUTES.seller.message(conversationId));
  return {};
}
