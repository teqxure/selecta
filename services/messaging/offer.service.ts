import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";
import { notify } from "@/services/notifications/notify.service";
import { ROUTES } from "@/lib/constants/routes";

const MAX_OFFER_AMOUNT = 10_000_000;

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

/**
 * The negotiation counterpart to the boost/subscription monetization work —
 * keeps price haggling (which sellers otherwise push to WhatsApp) inside
 * Selecta, ending in a real checkout through the existing payment/escrow
 * pipeline rather than a side deal.
 */
export async function makeOffer(conversationId: string, buyerId: string, productId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_OFFER_AMOUNT) {
    throw new ValidationError("Enter a valid offer amount");
  }

  const conversation = await db.conversation.findUnique({ where: { id: conversationId }, include: { sellerProfile: true } });
  if (!conversation) throw new NotFoundError("Conversation");
  if (conversation.buyerId !== buyerId) throw new ForbiddenError("You don't have access to this conversation");

  const product = await db.product.findFirst({ where: { id: productId, sellerId: conversation.sellerProfileId, status: "ACTIVE" } });
  if (!product) throw new NotFoundError("Active product");

  const existing = await db.offer.findFirst({ where: { conversationId, productId, status: "PENDING" } });
  if (existing) throw new ConflictError("There's already a pending offer on this product in this conversation");

  const offer = await db.offer.create({
    data: { conversationId, productId, buyerId, sellerId: conversation.sellerProfileId, amount },
  });

  await notify({
    event: "OFFER_RECEIVED",
    userId: conversation.sellerProfile.userId,
    title: "New offer received",
    message: `An offer of ${formatNaira(amount)} was made on "${product.title}".`,
    actionUrl: ROUTES.seller.message(conversationId),
    emailVariables: { amount: formatNaira(amount), productTitle: product.title },
  });

  return offer;
}

async function getOwnedPendingOffer(offerId: string, sellerUserId: string) {
  const offer = await db.offer.findUnique({ where: { id: offerId }, include: { seller: true, product: true } });
  if (!offer) throw new NotFoundError("Offer");
  if (offer.seller.userId !== sellerUserId) throw new ForbiddenError("You don't have access to this offer");
  if (offer.status !== "PENDING") throw new ValidationError(`This offer is already ${offer.status.toLowerCase()}`);
  return offer;
}

export async function acceptOffer(offerId: string, sellerUserId: string) {
  const offer = await getOwnedPendingOffer(offerId, sellerUserId);

  const claim = await db.offer.updateMany({ where: { id: offerId, status: "PENDING" }, data: { status: "ACCEPTED" } });
  if (claim.count === 0) throw new ValidationError("This offer was already actioned");

  await notify({
    event: "OFFER_ACCEPTED",
    userId: offer.buyerId,
    title: "Your offer was accepted",
    message: `Your offer of ${formatNaira(Number(offer.amount))} on "${offer.product.title}" was accepted — complete checkout to secure it.`,
    actionUrl: ROUTES.message(offer.conversationId),
    emailVariables: { amount: formatNaira(Number(offer.amount)), productTitle: offer.product.title },
  });

  return db.offer.findUniqueOrThrow({ where: { id: offerId } });
}

export async function rejectOffer(offerId: string, sellerUserId: string) {
  const offer = await getOwnedPendingOffer(offerId, sellerUserId);

  const claim = await db.offer.updateMany({ where: { id: offerId, status: "PENDING" }, data: { status: "REJECTED" } });
  if (claim.count === 0) throw new ValidationError("This offer was already actioned");

  await notify({
    event: "OFFER_REJECTED",
    userId: offer.buyerId,
    title: "Offer declined",
    message: `Your offer of ${formatNaira(Number(offer.amount))} on "${offer.product.title}" was declined.`,
    actionUrl: ROUTES.message(offer.conversationId),
  });

  return db.offer.findUniqueOrThrow({ where: { id: offerId } });
}

export async function counterOffer(offerId: string, sellerUserId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_OFFER_AMOUNT) {
    throw new ValidationError("Enter a valid counter-offer amount");
  }
  const offer = await getOwnedPendingOffer(offerId, sellerUserId);

  const countered = await db.$transaction(async (tx) => {
    const claim = await tx.offer.updateMany({ where: { id: offerId, status: "PENDING" }, data: { status: "COUNTERED" } });
    if (claim.count === 0) throw new ValidationError("This offer was already actioned");

    return tx.offer.create({
      data: {
        conversationId: offer.conversationId,
        productId: offer.productId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        amount,
        previousOfferId: offer.id,
      },
    });
  });

  await notify({
    event: "OFFER_RECEIVED",
    userId: offer.buyerId,
    title: "Seller countered your offer",
    message: `The seller countered with ${formatNaira(amount)} on "${offer.product.title}".`,
    actionUrl: ROUTES.message(offer.conversationId),
    emailVariables: { amount: formatNaira(amount), productTitle: offer.product.title },
  });

  return countered;
}

export async function cancelOffer(offerId: string, buyerId: string) {
  const offer = await db.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new NotFoundError("Offer");
  if (offer.buyerId !== buyerId) throw new ForbiddenError("You don't have access to this offer");

  const claim = await db.offer.updateMany({ where: { id: offerId, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (claim.count === 0) throw new ValidationError("This offer was already actioned");

  return db.offer.findUniqueOrThrow({ where: { id: offerId } });
}

/** The exact record checkout re-derives price from — never trusts a client-supplied amount. */
export async function getAcceptedOfferForCheckout(offerId: string, buyerId: string) {
  const offer = await db.offer.findUnique({ where: { id: offerId }, include: { product: true } });
  if (!offer) throw new NotFoundError("Offer");
  if (offer.buyerId !== buyerId) throw new ForbiddenError("You don't have access to this offer");
  if (offer.status !== "ACCEPTED") throw new ValidationError("This offer hasn't been accepted yet");
  if (offer.orderId) throw new ConflictError("This offer has already been used for an order");
  return offer;
}

export function listOffersForConversation(conversationId: string) {
  return db.offer.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, include: { product: { select: { title: true } } } });
}
