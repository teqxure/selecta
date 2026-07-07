import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { releaseTransaction, refundTransaction } from "@/services/payments/payment.service";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import type { DisputeType } from "@/generated/prisma/enums";

export interface FileDisputeInput {
  orderId: string;
  sellerId: string;
  type: DisputeType;
  description: string;
  evidenceUrls?: string[];
}

/**
 * A buyer reporting a problem with one seller's part of an order — Dispute
 * is scoped to (order, seller) since a multi-seller order can have an
 * issue with only one of them. Opening a dispute moves the whole Order to
 * DISPUTED as a side branch of the normal lifecycle; it doesn't touch
 * escrow by itself — that only happens once an admin resolves it below.
 */
export async function fileDispute(buyerId: string, input: FileDisputeInput) {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new NotFoundError("Order");
  if (order.buyerId !== buyerId) throw new ForbiddenError();

  const sellerHasItemsInOrder = order.items.some((item) => item.product.sellerId === input.sellerId);
  if (!sellerHasItemsInOrder) throw new ValidationError("That seller has no items in this order");

  const existing = await db.dispute.findFirst({
    where: { orderId: input.orderId, sellerId: input.sellerId, status: { notIn: ["CLOSED"] } },
  });
  if (existing) throw new ValidationError("You already have an open dispute for this seller on this order");

  const dispute = await db.$transaction(async (tx) => {
    const created = await tx.dispute.create({
      data: {
        orderId: input.orderId,
        buyerId,
        sellerId: input.sellerId,
        type: input.type,
        description: input.description,
        evidenceUrls: input.evidenceUrls ?? [],
      },
    });

    await tx.order.update({ where: { id: input.orderId }, data: { status: "DISPUTED" } });
    await tx.orderStatusHistory.create({
      data: { orderId: input.orderId, status: "DISPUTED", actorId: buyerId, note: `Dispute opened: ${input.type}` },
    });

    return created;
  });

  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: input.sellerId } });
  await createNotification(
    sellerProfile.userId,
    "ORDER",
    "A dispute was opened",
    `A buyer opened a dispute on order #${order.id.slice(-8)} — Selecta will review it shortly.`,
  );

  return dispute;
}

export function listDisputesForBuyer(buyerId: string) {
  return db.dispute.findMany({ where: { buyerId }, orderBy: { createdAt: "desc" } });
}

export function listDisputes(status?: "OPEN" | "UNDER_REVIEW") {
  return db.dispute.findMany({
    where: status ? { status } : undefined,
    include: { order: true, buyer: true, seller: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDisputeForAdmin(disputeId: string) {
  const dispute = await db.dispute.findUnique({
    where: { id: disputeId },
    include: {
      order: { include: { payment: true, transactions: true, items: { include: { product: true } } } },
      buyer: true,
      seller: { include: { user: true } },
      resolvedBy: true,
    },
  });
  if (!dispute) throw new NotFoundError("Dispute");
  return dispute;
}

export async function markDisputeUnderReview(adminId: string, disputeId: string) {
  return db.$transaction(async (tx) => {
    const dispute = await tx.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) throw new NotFoundError("Dispute");
    if (dispute.status !== "OPEN") throw new ValidationError("Only open disputes can move to under review");

    const updated = await tx.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DISPUTE_UNDER_REVIEW", entityType: "Dispute", entityId: disputeId },
    });
    return updated;
  });
}

async function findEscrowedTransaction(orderId: string, sellerId: string) {
  const transaction = await db.transaction.findFirst({ where: { orderId, sellerId, status: "HELD_IN_ESCROW" } });
  if (!transaction) {
    throw new ValidationError("No escrowed transaction found for this seller on this order — it may already be settled");
  }
  return transaction;
}

/** Sides with the buyer: the seller's escrowed transaction is refunded, not released. */
export async function resolveDisputeWithRefund(adminId: string, disputeId: string, resolution: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError("Dispute");

  const transaction = await findEscrowedTransaction(dispute.orderId, dispute.sellerId);
  await refundTransaction(transaction.id, adminId);

  return finalizeDisputeResolution(adminId, disputeId, "RESOLVED_REFUND", resolution);
}

/** Sides with the seller: the escrowed transaction releases to their wallet as normal. */
export async function resolveDisputeWithRelease(adminId: string, disputeId: string, resolution: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError("Dispute");

  const transaction = await findEscrowedTransaction(dispute.orderId, dispute.sellerId);
  await releaseTransaction(transaction.id, adminId);

  return finalizeDisputeResolution(adminId, disputeId, "RESOLVED_RELEASE", resolution);
}

/** Closes a dispute with no financial action — e.g. determined invalid or withdrawn. */
export async function closeDisputeWithoutAction(adminId: string, disputeId: string, resolution: string) {
  return finalizeDisputeResolution(adminId, disputeId, "CLOSED", resolution);
}

async function finalizeDisputeResolution(
  adminId: string,
  disputeId: string,
  status: "RESOLVED_REFUND" | "RESOLVED_RELEASE" | "CLOSED",
  resolution: string,
) {
  const result = await db.$transaction(async (tx) => {
    const dispute = await tx.dispute.update({
      where: { id: disputeId },
      data: { status, resolution, resolvedById: adminId, resolvedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "DISPUTE_RESOLVED",
        entityType: "Dispute",
        entityId: disputeId,
        metadata: { status, resolution } as object,
      },
    });

    return dispute;
  });

  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: result.sellerId } });
  const message = `Dispute on order #${result.orderId.slice(-8)} resolved: ${resolution}`;
  await Promise.all([
    createNotification(result.buyerId, "ORDER", "Dispute resolved", message),
    createNotification(sellerProfile.userId, "ORDER", "Dispute resolved", message),
  ]);

  return result;
}
