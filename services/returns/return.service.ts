import "server-only";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { recordAdjustment } from "@/services/finance/ledger.service";
import { refundTransaction } from "@/services/payments/payment.service";
import { createNotification } from "@/services/notifications/notification.service";
import type { ReturnOutcome } from "@/generated/prisma/enums";

const RETURN_ELIGIBLE_ORDER_STATUSES = ["DELIVERED", "COMPLETED"];

export async function createReturnRequest(buyerId: string, orderItemId: string, reason: string, evidenceUrls: string[] = []) {
  const orderItem = await db.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true, product: true, returnRequest: true },
  });
  if (!orderItem) throw new NotFoundError("Order item");
  if (orderItem.order.buyerId !== buyerId) throw new ForbiddenError("This isn't your order");
  if (orderItem.returnRequest) throw new ValidationError("A return has already been filed for this item");
  if (!RETURN_ELIGIBLE_ORDER_STATUSES.includes(orderItem.order.status)) {
    throw new ValidationError("This item isn't eligible for a return yet");
  }

  const request = await db.returnRequest.create({
    data: {
      orderItemId,
      buyerId,
      sellerId: orderItem.product.sellerId,
      reason: sanitizeText(reason),
      evidenceUrls,
    },
  });

  await db.auditLog.create({ data: { action: "RETURN_REQUESTED", entityType: "ReturnRequest", entityId: request.id } });

  return request;
}

const RETURN_DETAIL_INCLUDE = {
  orderItem: { include: { product: true, order: true } },
  buyer: true,
  seller: { include: { user: true } },
} as const;

export function listReturnsForBuyer(buyerId: string) {
  return db.returnRequest.findMany({ where: { buyerId }, include: RETURN_DETAIL_INCLUDE, orderBy: { createdAt: "desc" } });
}

export function listReturnsForSeller(sellerId: string) {
  return db.returnRequest.findMany({ where: { sellerId }, include: RETURN_DETAIL_INCLUDE, orderBy: { createdAt: "desc" } });
}

export function getReturnById(returnId: string) {
  return db.returnRequest.findUnique({ where: { id: returnId }, include: RETURN_DETAIL_INCLUDE });
}

export function listReturnQueue(status?: "REQUESTED" | "APPROVED" | "REJECTED" | "ITEM_RECEIVED" | "COMPLETED") {
  return db.returnRequest.findMany({
    where: status ? { status } : {},
    include: RETURN_DETAIL_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export async function approveReturn(adminId: string, returnId: string, notes?: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new NotFoundError("Return request");
    if (request.status !== "REQUESTED") throw new ValidationError("This return has already been reviewed");

    const updated = await tx.returnRequest.update({
      where: { id: returnId },
      data: { status: "APPROVED", resolutionNotes: sanitizeOptionalText(notes) },
    });
    await tx.auditLog.create({ data: { actorId: adminId, action: "RETURN_APPROVED", entityType: "ReturnRequest", entityId: returnId } });
    await createNotification(request.buyerId, "SYSTEM", "Return approved", "Your return request was approved — follow the instructions to send the item back.");
    return updated;
  });
}

export async function rejectReturn(adminId: string, returnId: string, reason: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new NotFoundError("Return request");
    if (request.status !== "REQUESTED") throw new ValidationError("This return has already been reviewed");

    const updated = await tx.returnRequest.update({
      where: { id: returnId },
      data: { status: "REJECTED", outcome: "REJECTED", resolvedById: adminId, resolvedAt: new Date(), resolutionNotes: sanitizeText(reason) },
    });
    await tx.auditLog.create({ data: { actorId: adminId, action: "RETURN_REJECTED", entityType: "ReturnRequest", entityId: returnId, metadata: { reason } } });
    await createNotification(request.buyerId, "SYSTEM", "Return request declined", `Your return request wasn't approved: ${reason}`);
    return updated;
  });
}

export async function markReturnItemReceived(adminId: string, returnId: string) {
  return db.$transaction(async (tx) => {
    const request = await tx.returnRequest.findUnique({ where: { id: returnId } });
    if (!request) throw new NotFoundError("Return request");
    if (request.status !== "APPROVED") throw new ValidationError("This return isn't awaiting item receipt");

    const updated = await tx.returnRequest.update({ where: { id: returnId }, data: { status: "ITEM_RECEIVED" } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "RETURN_ITEM_RECEIVED", entityType: "ReturnRequest", entityId: returnId } });
    return updated;
  });
}

/**
 * Debits the seller's already-released wallet balance directly — used
 * when a return is resolved after the underlying Transaction has already
 * settled (the common case, since returns are typically filed after
 * DELIVERED/COMPLETED). Mirrors the existing manual-wallet-correction
 * pattern in admin/sellers actions; never touches `totalEarned` (lifetime,
 * never decreases — see Wallet's own doc comment).
 */
async function debitSellerWalletForReturn(sellerUserId: string, amount: number, returnId: string, actorId: string) {
  await db.$transaction(async (tx) => {
    await tx.wallet.update({ where: { userId: sellerUserId }, data: { balance: { decrement: amount } } });
    await recordAdjustment(tx, {
      amount: -amount,
      userId: sellerUserId,
      note: "Return refund — deducted from seller balance",
      metadata: { returnId },
      actorId,
    });
    await tx.auditLog.create({
      data: { actorId, action: "RETURN_SELLER_WALLET_DEBITED", entityType: "ReturnRequest", entityId: returnId, metadata: { amount } },
    });
  });
}

export interface ResolveReturnInput {
  outcome: ReturnOutcome;
  refundAmount?: number;
  notes?: string;
}

/**
 * Terminal resolution. For a refund outcome: if the seller's Transaction is
 * still HELD_IN_ESCROW, reuses the existing escrow-refund path; otherwise
 * (money already released — the common post-delivery case) debits the
 * seller's wallet directly. Actually moving money back to the buyer's
 * payment method is, same as Dispute resolution today, a manual
 * off-system step — this system's ledger only needs to match reality.
 */
export async function resolveReturn(adminId: string, returnId: string, input: ResolveReturnInput) {
  const request = await db.returnRequest.findUnique({
    where: { id: returnId },
    include: { orderItem: true, seller: true },
  });
  if (!request) throw new NotFoundError("Return request");
  if (request.status === "REJECTED" || request.status === "COMPLETED") {
    throw new ValidationError("This return has already been resolved");
  }

  const isRefundOutcome = input.outcome === "FULL_REFUND" || input.outcome === "PARTIAL_REFUND" || input.outcome === "REFUND_WITHOUT_RETURN";
  if (isRefundOutcome && (!input.refundAmount || input.refundAmount <= 0)) {
    throw new ValidationError("A positive refund amount is required for this outcome");
  }

  if (isRefundOutcome) {
    const transaction = await db.transaction.findFirst({ where: { orderId: request.orderItem.orderId, sellerId: request.sellerId } });
    if (transaction?.status === "HELD_IN_ESCROW") {
      await refundTransaction(transaction.id, adminId);
    } else {
      await debitSellerWalletForReturn(request.seller.userId, input.refundAmount!, returnId, adminId);
    }
  }

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.returnRequest.update({
      where: { id: returnId },
      data: {
        status: "COMPLETED",
        outcome: input.outcome,
        refundAmount: input.refundAmount ?? null,
        resolvedById: adminId,
        resolvedAt: new Date(),
        resolutionNotes: sanitizeOptionalText(input.notes),
      },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "RETURN_RESOLVED", entityType: "ReturnRequest", entityId: returnId, metadata: input as object },
    });
    return result;
  });

  await createNotification(
    request.buyerId,
    "SYSTEM",
    "Return resolved",
    `Your return has been resolved: ${input.outcome.replaceAll("_", " ").toLowerCase()}.`,
  );

  return updated;
}
