import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
import { releaseTransaction, refundTransaction } from "@/services/payments/payment.service";
import { transitionOrderStatus } from "@/services/orders/order-state-machine";
import { getOrCreateConversation } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";
import type { DisputeType } from "@/generated/prisma/enums";
import type { OrderStatus } from "@/generated/prisma/enums";

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
 * DISPUTED as a side branch of the normal lifecycle (validated by the
 * shared state machine — a buyer can only do this from an order that's
 * actually been paid for, not e.g. one still AWAITING_PAYMENT or already
 * CANCELLED). If the order is already DISPUTED (a different seller's
 * dispute is still open), there's nothing to transition — we just add
 * this seller's Dispute row alongside it.
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
    where: { orderId: input.orderId, sellerId: input.sellerId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
  });
  if (existing) throw new ValidationError("You already have an open dispute for this seller on this order");

  const description = sanitizeText(input.description);
  if (!description) throw new ValidationError("Describe the issue before filing a dispute");
  if (description.length > 3000) throw new ValidationError("Description is too long (3000 characters max)");

  if (order.status !== "DISPUTED") {
    await transitionOrderStatus(input.orderId, { type: "BUYER", userId: buyerId }, "DISPUTED", {
      note: `Dispute opened: ${input.type}`,
      skipNotification: true,
    });
  }

  const dispute = await db.dispute.create({
    data: {
      orderId: input.orderId,
      buyerId,
      sellerId: input.sellerId,
      type: input.type,
      description,
      evidenceUrls: input.evidenceUrls ?? [],
    },
  });

  // A dedicated thread so buyer, seller, and (via the admin trust dashboard)
  // support staff can discuss the dispute directly — never off-platform.
  const conversation = await getOrCreateConversation(buyerId, input.sellerId, { type: "DISPUTE_DISCUSSION", orderId: input.orderId, disputeId: dispute.id });

  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: input.sellerId } });
  const orderRef = order.id.slice(-8);
  await notify({
    event: "DISPUTE_OPENED",
    userId: sellerProfile.userId,
    title: "A dispute was opened",
    message: `A buyer opened a dispute on order #${orderRef} — Selecta will review it shortly.`,
    actionUrl: ROUTES.seller.message(conversation.id),
    emailVariables: { orderId: order.id, message: `A dispute was opened on order #${orderRef}.` },
  });

  await alertAdmins(
    "New dispute opened",
    `A dispute (${input.type}) was opened on order #${orderRef} against ${sellerProfile.businessName}.`,
    { actionUrl: `/admin/disputes`, metadata: { disputeId: dispute.id, orderId: order.id } },
  );

  return { ...dispute, conversationId: conversation.id };
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
    const claim = await tx.dispute.updateMany({ where: { id: disputeId, status: "OPEN" }, data: { status: "UNDER_REVIEW" } });
    if (claim.count === 0) throw new ValidationError("Only open disputes can move to under review");

    const updated = await tx.dispute.findUniqueOrThrow({ where: { id: disputeId } });
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

/**
 * The order-level status only ever reflects ONE outcome, but a
 * multi-seller order can have several sellers' disputes in flight at
 * once — only actually move the order out of DISPUTED once every seller's
 * dispute on it has been resolved, and only using the LATEST resolution's
 * outcome (a known simplification: this schema has no way to represent
 * "refunded for seller A, completed for seller B" at the order level).
 */
async function transitionOrderOutOfDisputeIfClear(
  orderId: string,
  disputeId: string,
  adminId: string,
  resolutionStatus: "COMPLETED" | "REFUNDED",
) {
  // Exclude the dispute we're in the middle of resolving — its status
  // hasn't been flipped to RESOLVED_* yet at this point, so without this
  // exclusion it would always count itself as "still open" and this
  // would never fire.
  const stillOpen = await db.dispute.count({
    where: { orderId, status: { in: ["OPEN", "UNDER_REVIEW"] }, id: { not: disputeId } },
  });
  if (stillOpen > 0) return;

  await transitionOrderStatus(orderId, { type: "ADMIN", userId: adminId }, resolutionStatus, {
    note: "Dispute resolved",
    skipNotification: true,
  });
}

/** Sides with the buyer: the seller's escrowed transaction is refunded, not released. */
export async function resolveDisputeWithRefund(adminId: string, disputeId: string, resolution: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError("Dispute");
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new ValidationError("This dispute has already been resolved");
  }

  const transaction = await findEscrowedTransaction(dispute.orderId, dispute.sellerId);
  await refundTransaction(transaction.id, adminId);
  await transitionOrderOutOfDisputeIfClear(dispute.orderId, disputeId, adminId, "REFUNDED");

  return finalizeDisputeResolution(adminId, disputeId, "RESOLVED_REFUND", resolution);
}

/** Sides with the seller: the escrowed transaction releases to their wallet as normal. */
export async function resolveDisputeWithRelease(adminId: string, disputeId: string, resolution: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError("Dispute");
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new ValidationError("This dispute has already been resolved");
  }

  const transaction = await findEscrowedTransaction(dispute.orderId, dispute.sellerId);
  await releaseTransaction(transaction.id, adminId);
  await transitionOrderOutOfDisputeIfClear(dispute.orderId, disputeId, adminId, "COMPLETED");

  return finalizeDisputeResolution(adminId, disputeId, "RESOLVED_RELEASE", resolution);
}

/** Closes a dispute with no financial action — e.g. determined invalid or withdrawn. Reverts the order to whatever it was before the dispute, if nothing else is still disputing it. */
export async function closeDisputeWithoutAction(adminId: string, disputeId: string, resolution: string) {
  const dispute = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError("Dispute");
  if (dispute.status !== "OPEN" && dispute.status !== "UNDER_REVIEW") {
    throw new ValidationError("This dispute has already been resolved");
  }

  const stillOpen = await db.dispute.count({
    where: { orderId: dispute.orderId, status: { in: ["OPEN", "UNDER_REVIEW"] }, id: { not: disputeId } },
  });
  if (stillOpen === 0) {
    const revertTo = await findPreDisputeStatus(dispute.orderId);
    if (revertTo) {
      await transitionOrderStatus(dispute.orderId, { type: "ADMIN", userId: adminId }, revertTo, {
        note: "Dispute closed without action — order resumed",
        skipNotification: true,
      });
    }
  }

  return finalizeDisputeResolution(adminId, disputeId, "CLOSED", resolution);
}

/** The order's status immediately before it most recently entered DISPUTED — what to revert to when a dispute is closed with no action. */
async function findPreDisputeStatus(orderId: string): Promise<OrderStatus | null> {
  const history = await db.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
  let preDispute: OrderStatus | null = null;
  for (let i = 0; i < history.length; i++) {
    if (history[i].status === "DISPUTED" && i > 0) {
      preDispute = history[i - 1].status;
    }
  }
  return preDispute;
}

async function finalizeDisputeResolution(
  adminId: string,
  disputeId: string,
  status: "RESOLVED_REFUND" | "RESOLVED_RELEASE" | "CLOSED",
  resolution: string,
) {
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.dispute.updateMany({
      where: { id: disputeId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
      data: { status, resolution, resolvedById: adminId, resolvedAt: new Date() },
    });
    if (claim.count === 0) throw new ValidationError("This dispute has already been resolved");

    const dispute = await tx.dispute.findUniqueOrThrow({ where: { id: disputeId } });

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
    notify({
      event: "DISPUTE_RESOLVED",
      userId: result.buyerId,
      title: "Dispute resolved",
      message,
      actionUrl: `/orders/${result.orderId}`,
      emailVariables: { orderId: result.orderId, message },
    }),
    notify({
      event: "DISPUTE_RESOLVED",
      userId: sellerProfile.userId,
      title: "Dispute resolved",
      message,
      actionUrl: `/seller/orders/${result.orderId}`,
      emailVariables: { orderId: result.orderId, message },
    }),
  ]);

  return result;
}
