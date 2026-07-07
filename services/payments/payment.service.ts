import "server-only";
import { db } from "@/lib/db";
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

export async function releaseToSeller(paymentId: string) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new NotFoundError("Payment");
  if (payment.status !== "HELD_IN_ESCROW") {
    throw new ValidationError("Only escrowed payments can be released");
  }

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    const orderItem = await tx.orderItem.findFirstOrThrow({ where: { orderId: order.id } });
    const product = await tx.product.findUniqueOrThrow({ where: { id: orderItem.productId } });
    const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: product.sellerId } });

    await tx.wallet.upsert({
      where: { userId: sellerProfile.userId },
      create: { userId: sellerProfile.userId, balance: payment.amount },
      update: { balance: { increment: payment.amount } },
    });

    return tx.payment.update({ where: { id: paymentId }, data: { status: "RELEASED" } });
  });
}
