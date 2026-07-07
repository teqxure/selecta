import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { getActiveCommissionRateForCategory } from "@/services/platform/commission.service";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Escrow lifecycle, split across two models on purpose:
 *
 *   Payment      (1:1 per order)   PENDING -> HELD_IN_ESCROW -> RELEASED | REFUNDED | FAILED
 *   Transaction  (1 per seller in the order) PENDING -> HELD_IN_ESCROW -> RELEASED | REFUNDED
 *
 * Payment is the buyer-facing capture record. Transaction is the seller
 * payout ledger — it exists because one order can span multiple sellers,
 * each with their own commission rate and their own release/refund/dispute
 * outcome. Never trust a frontend "payment succeeded" call: the only way
 * a Payment/Transaction moves out of PENDING is `confirmPaymentSuccess`,
 * driven exclusively by a signature-verified provider webhook.
 */

export async function initiatePayment(orderId: string, provider: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) throw new NotFoundError("Order");
  if (order.payment) throw new ConflictError("This order already has a payment initiated");

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { orderId, amount: order.totalAmount, currency: order.currency, provider, status: "PENDING" },
    });

    await tx.order.update({ where: { id: orderId }, data: { status: "AWAITING_PAYMENT" } });
    await tx.orderStatusHistory.create({ data: { orderId, status: "AWAITING_PAYMENT" } });

    return payment;
  });
}

/**
 * The single entry point for a provider confirming a charge succeeded.
 * Idempotent by design — providers retry webhooks, so this must be safe
 * to call twice for the same reference without double-crediting anyone.
 * Computes each seller's commission from the live CommissionRule table
 * (never a hardcoded percentage) and creates one Transaction per seller,
 * held in escrow until delivery is confirmed or an admin releases it.
 */
export async function confirmPaymentSuccess(paymentId: string, providerReference: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError("Payment");

  if (payment.status === "HELD_IN_ESCROW" || payment.status === "RELEASED") {
    // Already processed by an earlier webhook delivery — no-op.
    return { payment, alreadyProcessed: true as const };
  }
  if (payment.status !== "PENDING") {
    throw new ValidationError(`Cannot confirm a payment in status ${payment.status}`);
  }

  const items = await db.orderItem.findMany({
    where: { orderId: payment.orderId },
    include: { product: { include: { seller: true } } },
  });
  if (items.length === 0) throw new NotFoundError("Order items");

  const bySeller = new Map<
    string,
    { userId: string; productIds: string[]; gross: number; commission: number; sellerAmount: number }
  >();
  const rateCache = new Map<string, number>();

  for (const item of items) {
    const categoryId = item.product.categoryId;
    if (!rateCache.has(categoryId)) {
      const { percentage } = await getActiveCommissionRateForCategory(categoryId);
      rateCache.set(categoryId, percentage);
    }
    const rate = rateCache.get(categoryId)!;

    const lineTotal = Number(item.unitPrice) * item.quantity;
    const lineCommission = (lineTotal * rate) / 100;

    const entry = bySeller.get(item.product.sellerId) ?? {
      userId: item.product.seller.userId,
      productIds: [],
      gross: 0,
      commission: 0,
      sellerAmount: 0,
    };
    entry.productIds.push(item.productId);
    entry.gross += lineTotal;
    entry.commission += lineCommission;
    entry.sellerAmount += lineTotal - lineCommission;
    bySeller.set(item.product.sellerId, entry);
  }

  const transactions = await db.$transaction(async (tx) => {
    const updatedPayment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "HELD_IN_ESCROW", providerReference },
    });

    const created = [];
    for (const [sellerId, entry] of bySeller) {
      const blendedRate = entry.gross > 0 ? (entry.commission / entry.gross) * 100 : 0;

      const transaction = await tx.transaction.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          buyerId: (await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } })).buyerId,
          sellerId,
          amount: entry.gross,
          commissionRate: blendedRate,
          commissionAmount: entry.commission,
          sellerAmount: entry.sellerAmount,
          currency: payment.currency,
          provider: payment.provider,
          reference: `${providerReference}:${sellerId}`,
          status: "HELD_IN_ESCROW",
        },
      });
      created.push({ transaction, userId: entry.userId });
    }

    await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
    await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, status: "PAID" } });

    await tx.auditLog.create({
      data: {
        action: "PAYMENT_CONFIRMED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { providerReference, sellerCount: created.length } as object,
      },
    });

    return { updatedPayment, created };
  });

  await Promise.all(
    transactions.created.map(({ userId, transaction }) =>
      createNotification(
        userId,
        "PAYMENT",
        "Payment received — held in escrow",
        `₦${Number(transaction.sellerAmount).toLocaleString("en-NG", { maximumFractionDigits: 2 })} is held in escrow and will release once delivery is confirmed.`,
      ),
    ),
  );

  return { payment: transactions.updatedPayment, alreadyProcessed: false as const };
}

export async function markPaymentFailed(paymentId: string) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED" } });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "CANCELLED" } });
    await tx.orderStatusHistory.create({ data: { orderId: payment.orderId, status: "CANCELLED", note: "Payment failed" } });
    return payment;
  });
}

async function releaseTransactionInternal(tx: Prisma.TransactionClient, transactionId: string, actorId: string | null) {
  const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new NotFoundError("Transaction");
  if (transaction.status !== "HELD_IN_ESCROW") {
    throw new ValidationError("Only escrowed transactions can be released");
  }

  const released = await tx.transaction.update({ where: { id: transactionId }, data: { status: "RELEASED" } });

  const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: transaction.sellerId } });
  const sellerAmount = Number(transaction.sellerAmount);

  await tx.wallet.upsert({
    where: { userId: sellerProfile.userId },
    create: { userId: sellerProfile.userId, balance: sellerAmount, totalEarned: sellerAmount },
    update: { balance: { increment: sellerAmount }, totalEarned: { increment: sellerAmount } },
  });

  const items = await tx.orderItem.findMany({
    where: { orderId: transaction.orderId, product: { sellerId: transaction.sellerId } },
  });
  await tx.sellerProfile.update({ where: { id: transaction.sellerId }, data: { totalSales: { increment: items.length } } });
  await tx.product.updateMany({ where: { id: { in: items.map((item) => item.productId) } }, data: { status: "SOLD" } });

  await tx.auditLog.create({
    data: { actorId, action: "TRANSACTION_RELEASED", entityType: "Transaction", entityId: transactionId },
  });

  return { transaction: released, sellerUserId: sellerProfile.userId, sellerAmount };
}

/** Admin manual release (or dispute resolution) of a single seller's escrowed transaction. */
export async function releaseTransaction(transactionId: string, actorId: string) {
  const result = await db.$transaction((tx) => releaseTransactionInternal(tx, transactionId, actorId));

  await createNotification(
    result.sellerUserId,
    "PAYMENT",
    "Payment released",
    `₦${result.sellerAmount.toLocaleString("en-NG", { maximumFractionDigits: 2 })} has been released to your wallet.`,
  );

  return result.transaction;
}

/** Releases every escrowed transaction on an order at once — the delivery-confirmation path. */
export async function releaseOrderTransactions(orderId: string, actorId: string | null) {
  const held = await db.transaction.findMany({ where: { orderId, status: "HELD_IN_ESCROW" } });

  const results = await db.$transaction(async (tx) => {
    const released = [];
    for (const transaction of held) {
      released.push(await releaseTransactionInternal(tx, transaction.id, actorId));
    }
    return released;
  });

  await Promise.all(
    results.map((result) =>
      createNotification(
        result.sellerUserId,
        "PAYMENT",
        "Payment released",
        `₦${result.sellerAmount.toLocaleString("en-NG", { maximumFractionDigits: 2 })} has been released to your wallet.`,
      ),
    ),
  );

  return results.map((result) => result.transaction);
}

/** Dispute-driven refund of a single seller's escrowed transaction — no wallet credit. */
export async function refundTransaction(transactionId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundError("Transaction");
    if (transaction.status !== "HELD_IN_ESCROW") {
      throw new ValidationError("Only escrowed transactions can be refunded");
    }

    const refunded = await tx.transaction.update({ where: { id: transactionId }, data: { status: "REFUNDED" } });

    await tx.auditLog.create({
      data: { actorId, action: "TRANSACTION_REFUNDED", entityType: "Transaction", entityId: transactionId },
    });

    return refunded;
  });
}

/** Available (withdrawable), held (escrowed), withdrawn, and lifetime-earned balances for a seller's wallet. */
export async function getSellerBalances(sellerId: string) {
  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });

  const [wallet, heldAggregate] = await Promise.all([
    db.wallet.findUnique({ where: { userId: sellerProfile.userId } }),
    db.transaction.aggregate({
      where: { sellerId, status: "HELD_IN_ESCROW" },
      _sum: { sellerAmount: true },
    }),
  ]);

  return {
    available: Number(wallet?.balance ?? 0),
    held: Number(heldAggregate._sum.sellerAmount ?? 0),
    withdrawn: Number(wallet?.withdrawnBalance ?? 0),
    lifetime: Number(wallet?.totalEarned ?? 0),
  };
}
