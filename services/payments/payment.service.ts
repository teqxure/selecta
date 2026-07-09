import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
import { getActiveCommissionRateForCategory } from "@/services/platform/commission.service";
import { recordCustomerPayment, recordVendorCredit, recordCommissionEarned, recordRefund } from "@/services/finance/ledger.service";
import { transitionOrderStatusInTx } from "@/services/orders/order-state-machine";
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
 *
 * Every status transition below claims its row with a conditional
 * `updateMany({ where: { ..., status: <expected> } })` rather than a plain
 * `update` — that WHERE clause is evaluated against the row's live value
 * at lock-acquisition time, not a value read earlier, so two concurrent
 * callers (a retried webhook, a double-click) can never both win the same
 * transition. Whichever loses sees `count === 0` and treats it as a no-op
 * rather than double-crediting anyone.
 */

export async function initiatePayment(orderId: string, provider: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order) throw new NotFoundError("Order");
  if (order.payment) throw new ConflictError("This order already has a payment initiated");

  return db.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { orderId, amount: order.totalAmount, currency: order.currency, provider, status: "PENDING" },
    });

    await transitionOrderStatusInTx(tx, orderId, { type: "SYSTEM" }, "AWAITING_PAYMENT");

    return payment;
  });
}

/**
 * The single entry point for a provider confirming a charge succeeded.
 * Idempotent by design — providers retry webhooks, so this must be safe
 * to call twice (or twice concurrently) for the same reference without
 * double-crediting anyone. Computes each seller's commission from the
 * live CommissionRule table (never a hardcoded percentage) and creates
 * one Transaction per seller, held in escrow until delivery is confirmed
 * or an admin releases it.
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

  const [order, items] = await Promise.all([
    db.order.findUniqueOrThrow({ where: { id: payment.orderId } }),
    db.orderItem.findMany({
      where: { orderId: payment.orderId },
      include: { product: { include: { seller: true } } },
    }),
  ]);
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

  const outcome = await db.$transaction(async (tx) => {
    // Atomic claim: only the first caller to reach this point for a given
    // payment ever proceeds past here. A concurrent/retried call loses
    // the race here and returns null instead of creating duplicate
    // Transaction rows or crediting anyone twice.
    const claim = await tx.payment.updateMany({
      where: { id: paymentId, status: "PENDING" },
      data: { status: "HELD_IN_ESCROW", providerReference },
    });
    if (claim.count === 0) return null;

    const updatedPayment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

    const created = [];
    for (const [sellerId, entry] of bySeller) {
      const blendedRate = entry.gross > 0 ? (entry.commission / entry.gross) * 100 : 0;

      const transaction = await tx.transaction.create({
        data: {
          orderId: payment.orderId,
          paymentId: payment.id,
          buyerId: order.buyerId,
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

      await recordCustomerPayment(tx, {
        amount: entry.gross,
        userId: order.buyerId,
        sellerId,
        orderId: payment.orderId,
        paymentId: payment.id,
        transactionId: transaction.id,
        reference: providerReference,
        note: "Order paid, held in escrow",
      });

      created.push({ transaction, userId: entry.userId });
    }

    await transitionOrderStatusInTx(tx, payment.orderId, { type: "SYSTEM" }, "PAID");

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

  if (!outcome) {
    // Lost the atomic claim above — another call (or an earlier delivery
    // of this same webhook) already processed this payment.
    const current = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return { payment: current, alreadyProcessed: true as const };
  }

  const formattedAmount = `₦${Number(outcome.updatedPayment.amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  await notify({
    event: "ORDER_PAID",
    userId: order.buyerId,
    title: "Payment confirmed",
    message: `We've received your payment of ${formattedAmount} for this order.`,
    actionUrl: `/orders/${payment.orderId}`,
    emailVariables: { orderId: payment.orderId, amount: formattedAmount },
  });

  await Promise.all(
    outcome.created.map(({ userId, transaction }) =>
      createNotification(
        userId,
        "PAYMENT",
        "Payment received — held in escrow",
        `₦${Number(transaction.sellerAmount).toLocaleString("en-NG", { maximumFractionDigits: 2 })} is held in escrow and will release once delivery is confirmed.`,
      ),
    ),
  );

  return { payment: outcome.updatedPayment, alreadyProcessed: false as const };
}

export async function markPaymentFailed(paymentId: string) {
  const payment = await db.$transaction(async (tx) => {
    // Conditional claim — a stale/out-of-order "charge.failed" delivery
    // that arrives after the payment was already confirmed successful
    // must never cancel an order that's actually been paid for.
    const claim = await tx.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED" } });
    if (claim.count === 0) return null;

    const claimed = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await transitionOrderStatusInTx(tx, claimed.orderId, { type: "SYSTEM" }, "CANCELLED", { note: "Payment failed" });
    return claimed;
  });

  if (payment) {
    await alertAdmins(
      "Payment failed",
      `A payment of ₦${Number(payment.amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })} (${payment.provider}) failed for order #${payment.orderId.slice(-8)}.`,
      { actionUrl: `/admin/orders/${payment.orderId}`, metadata: { paymentId: payment.id, orderId: payment.orderId } },
    );
  }

  return payment;
}

async function releaseTransactionInternal(tx: Prisma.TransactionClient, transactionId: string, actorId: string | null) {
  const claim = await tx.transaction.updateMany({
    where: { id: transactionId, status: "HELD_IN_ESCROW" },
    data: { status: "RELEASED" },
  });
  if (claim.count === 0) {
    throw new ValidationError("Only escrowed transactions can be released");
  }
  const released = await tx.transaction.findUniqueOrThrow({ where: { id: transactionId } });

  const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: released.sellerId } });
  const sellerAmount = Number(released.sellerAmount);
  const commissionAmount = Number(released.commissionAmount);

  await tx.wallet.upsert({
    where: { userId: sellerProfile.userId },
    create: { userId: sellerProfile.userId, balance: sellerAmount, totalEarned: sellerAmount },
    update: { balance: { increment: sellerAmount }, totalEarned: { increment: sellerAmount } },
  });

  await recordVendorCredit(tx, {
    amount: sellerAmount,
    userId: sellerProfile.userId,
    sellerId: released.sellerId,
    orderId: released.orderId,
    transactionId: released.id,
    actorId: actorId ?? undefined,
    note: "Escrow released to available balance",
  });
  await recordCommissionEarned(tx, {
    amount: commissionAmount,
    sellerId: released.sellerId,
    orderId: released.orderId,
    transactionId: released.id,
    actorId: actorId ?? undefined,
    note: "Commission realized on escrow release",
  });

  const items = await tx.orderItem.findMany({
    where: { orderId: released.orderId, product: { sellerId: released.sellerId } },
  });
  await tx.sellerProfile.update({ where: { id: released.sellerId }, data: { totalSales: { increment: items.length } } });
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

/**
 * Dispute-driven refund of a single seller's escrowed transaction — no
 * wallet credit. If this was the last still-held transaction on its
 * parent Payment, the Payment itself is marked REFUNDED too, so it never
 * sits at a stale HELD_IN_ESCROW forever after every seller's cut has
 * actually been refunded.
 */
export async function refundTransaction(transactionId: string, actorId: string) {
  const refunded = await db.$transaction(async (tx) => {
    const claim = await tx.transaction.updateMany({
      where: { id: transactionId, status: "HELD_IN_ESCROW" },
      data: { status: "REFUNDED" },
    });
    if (claim.count === 0) {
      throw new ValidationError("Only escrowed transactions can be refunded");
    }
    const transaction = await tx.transaction.findUniqueOrThrow({ where: { id: transactionId } });

    await recordRefund(tx, {
      amount: Number(transaction.amount),
      userId: transaction.buyerId,
      sellerId: transaction.sellerId,
      orderId: transaction.orderId,
      transactionId: transaction.id,
      actorId,
      note: "Transaction refunded",
    });

    await tx.auditLog.create({
      data: { actorId, action: "TRANSACTION_REFUNDED", entityType: "Transaction", entityId: transactionId },
    });

    if (transaction.paymentId) {
      const siblings = await tx.transaction.findMany({ where: { paymentId: transaction.paymentId } });
      if (siblings.every((sibling) => sibling.status === "REFUNDED")) {
        await tx.payment.update({ where: { id: transaction.paymentId }, data: { status: "REFUNDED" } });
      }
    }

    return transaction;
  });

  const amount = `₦${Number(refunded.amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
  await notify({
    event: "REFUND_PROCESSED",
    userId: refunded.buyerId,
    title: "Refund processed",
    message: `A refund of ${amount} for this order has been processed back to you.`,
    actionUrl: `/orders/${refunded.orderId}`,
    emailVariables: { orderId: refunded.orderId, amount },
  });

  return refunded;
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
