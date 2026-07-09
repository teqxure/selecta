"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { currentUser } from "@/lib/auth/current-user";
import { sendMessage, setConversationArchived, reportConversation } from "@/services/messaging/conversation.service";
import { cancelOffer, getAcceptedOfferForCheckout } from "@/services/messaging/offer.service";
import { listAddresses } from "@/services/users/address.service";
import { createOrder } from "@/services/orders/order.service";
import { initiateCheckoutForOrder } from "@/services/payments/checkout.service";
import { ROUTES } from "@/lib/constants/routes";
import { checkMessageRateLimit, checkCheckoutRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError, isAppError } from "@/lib/errors";
import { db } from "@/lib/db";

export interface SendMessageState {
  error?: string;
  warning?: string;
}

export async function sendBuyerMessageAction(
  conversationId: string,
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const session = await requireAuth();
  if (!checkMessageRateLimit(session.userId).allowed) throw new RateLimitError();

  try {
    const imageUrl = String(formData.get("imageUrl") ?? "") || undefined;
    const { warning } = await sendMessage(conversationId, session.userId, String(formData.get("body") ?? ""), imageUrl);
    revalidatePath(ROUTES.message(conversationId));
    return { warning: warning ?? undefined };
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
}

export async function archiveBuyerConversationAction(conversationId: string) {
  const session = await requireAuth();
  await setConversationArchived(conversationId, session.userId, true);
  revalidatePath(ROUTES.messages);
}

export async function reportBuyerConversationAction(conversationId: string, formData: FormData) {
  const session = await requireAuth();
  await reportConversation(conversationId, session.userId, String(formData.get("reason") ?? ""));
  revalidatePath(ROUTES.message(conversationId));
}

export async function cancelOfferAction(conversationId: string, offerId: string) {
  const session = await requireAuth();
  await cancelOffer(offerId, session.userId);
  revalidatePath(ROUTES.message(conversationId));
}

export interface CheckoutOfferState {
  error?: string;
}

/** Same order/payment pipeline as the cart checkout — the only difference is a single line item priced from the accepted offer instead of the product's listed price. */
export async function checkoutOfferAction(offerId: string, _prevState: CheckoutOfferState): Promise<CheckoutOfferState> {
  const session = await requireAuth();

  let redirectUrl: string;
  try {
    if (!checkCheckoutRateLimit(session.userId).allowed) throw new RateLimitError();

    const offer = await getAcceptedOfferForCheckout(offerId, session.userId);

    const addresses = await listAddresses(session.userId);
    const address = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (!address) return { error: "Add a delivery address to your profile before checking out" };

    const buyer = await currentUser();
    if (!buyer) return { error: "Your session has expired — please sign in again" };

    const order = await createOrder(
      session.userId,
      [{ productId: offer.productId, quantity: 1, offerId: offer.id }],
      { line1: address.line1, line2: address.line2 ?? undefined, city: address.city, state: address.state, country: address.country },
    );

    try {
      redirectUrl = await initiateCheckoutForOrder(order.id, buyer.email, `${buyer.firstName} ${buyer.lastName}`);
    } catch (error) {
      await db.order.delete({ where: { id: order.id } });
      throw error;
    }
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(redirectUrl);
}
