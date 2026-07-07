import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Escrow lifecycle: PENDING (initiated) -> HELD_IN_ESCROW (buyer paid,
 * funds held) -> RELEASED (delivery confirmed, seller paid out) or
 * REFUNDED (dispute/cancellation). The actual payment provider integration
 * (Paystack/Flutterwave) plugs in at `initiatePayment` and the webhook
 * handler that calls `markHeldInEscrow`.
 */
export async function initiatePayment(orderId: string, provider: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");

  return db.payment.create({
    data: {
      orderId,
      amount: order.totalAmount,
      currency: order.currency,
      provider,
      status: "PENDING",
    },
  });
}

export async function markHeldInEscrow(paymentId: string, providerReference: string) {
  return db.payment.update({
    where: { id: paymentId },
    data: { status: "HELD_IN_ESCROW", providerReference },
  });
}

/**
 * An order can contain items from several sellers, so the escrowed payment
 * is split by each seller's share of the order subtotal, credited to their
 * wallet, and each of their items is marked SOLD — not just the first item,
 * which the original single-seller-shaped version of this function assumed.
 */
export async function releaseToSeller(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError("Payment");
  if (payment.status !== "HELD_IN_ESCROW") {
    throw new ValidationError("Only escrowed payments can be released");
  }

  const sellerPayouts = await db.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({
      where: { orderId: payment.orderId },
      include: { product: true },
    });
    if (items.length === 0) throw new NotFoundError("Order items");

    const orderSubtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);

    const bySeller = new Map<string, { subtotal: number; productIds: string[] }>();
    for (const item of items) {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const entry = bySeller.get(item.product.sellerId) ?? { subtotal: 0, productIds: [] };
      entry.subtotal += lineTotal;
      entry.productIds.push(item.productId);
      bySeller.set(item.product.sellerId, entry);
    }

    const payouts: { sellerProfileId: string; userId: string; amount: number }[] = [];

    for (const [sellerProfileId, { subtotal, productIds }] of bySeller) {
      const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: sellerProfileId } });
      const share = orderSubtotal > 0 ? (subtotal / orderSubtotal) * Number(payment.amount) : 0;

      await tx.wallet.upsert({
        where: { userId: sellerProfile.userId },
        create: { userId: sellerProfile.userId, balance: share, totalEarned: share },
        update: { balance: { increment: share }, totalEarned: { increment: share } },
      });

      await tx.sellerProfile.update({
        where: { id: sellerProfileId },
        data: { totalSales: { increment: productIds.length } },
      });

      await tx.product.updateMany({ where: { id: { in: productIds } }, data: { status: "SOLD" } });

      payouts.push({ sellerProfileId, userId: sellerProfile.userId, amount: share });
    }

    await tx.payment.update({ where: { id: paymentId }, data: { status: "RELEASED" } });

    return payouts;
  });

  await Promise.all(
    sellerPayouts.map((payout) =>
      createNotification(
        payout.userId,
        "PAYMENT",
        "Payment released",
        `A payment of ₦${payout.amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })} has been added to your wallet.`,
      ),
    ),
  );

  return sellerPayouts;
}

/**
 * This seller's share of orders whose payment is still HELD_IN_ESCROW —
 * i.e. sold but not yet released. Computed the same way `releaseToSeller`
 * splits a payout, just not committed to the wallet yet.
 */
export async function getSellerPendingBalance(sellerId: string) {
  // Every row here already belongs to this seller (the `where` filters on
  // it), so no second query is needed to isolate the seller's share.
  const sellerItems = await db.orderItem.findMany({
    where: { product: { sellerId }, order: { payment: { status: "HELD_IN_ESCROW" } } },
    include: { order: { include: { payment: true, items: true } } },
  });

  const byOrder = new Map<string, { sellerTotal: number; orderTotal: number; paymentAmount: number }>();
  for (const item of sellerItems) {
    if (byOrder.has(item.orderId) || !item.order.payment) continue;

    const orderTotal = item.order.items.reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);
    const sellerTotal = sellerItems
      .filter((line) => line.orderId === item.orderId)
      .reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);

    byOrder.set(item.orderId, { sellerTotal, orderTotal, paymentAmount: Number(item.order.payment.amount) });
  }

  let pending = 0;
  for (const { sellerTotal, orderTotal, paymentAmount } of byOrder.values()) {
    pending += orderTotal > 0 ? (sellerTotal / orderTotal) * paymentAmount : 0;
  }
  return pending;
}
