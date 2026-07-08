import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type { DeliveryMethod, DeliveryStatus, OrderStatus } from "@/generated/prisma/enums";

/** An order's OrderStatus drives the buyer/seller-facing lifecycle; DeliveryStatus is the narrower logistics sub-track riding alongside it. */
const ORDER_STATUS_TO_DELIVERY_STATUS: Partial<Record<OrderStatus, DeliveryStatus>> = {
  READY_FOR_PICKUP: "PENDING",
  IN_TRANSIT: "PICKED_UP",
  DELIVERED: "DELIVERED",
};

async function ensureDelivery(orderId: string) {
  const existing = await db.delivery.findUnique({ where: { orderId } });
  if (existing) return existing;

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  return db.delivery.create({ data: { orderId, address: order.shippingAddress as object } });
}

/** Called by order.service after a seller-driven status transition so the logistics timeline stays in sync automatically. */
export async function syncDeliveryStatus(orderId: string, orderStatus: OrderStatus, note?: string) {
  const mapped = ORDER_STATUS_TO_DELIVERY_STATUS[orderStatus];
  if (!mapped) return;

  const delivery = await ensureDelivery(orderId);

  await db.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: { status: mapped, deliveredAt: mapped === "DELIVERED" ? new Date() : delivery.deliveredAt },
    });
    await tx.deliveryEvent.create({ data: { deliveryId: delivery.id, status: mapped, note } });
  });
}

export interface DeliveryDetailsInput {
  method: DeliveryMethod;
  pickupLocation?: string | null;
  deliveryFee?: number | null;
  courier?: string | null;
  trackingCode?: string | null;
  estimatedAt?: Date | null;
}

/** Seller sets how this order will actually reach the buyer — before it leaves PROCESSING. */
export async function setDeliveryDetails(orderId: string, sellerUserId: string, input: DeliveryDetailsInput) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { seller: true } } } } },
  });
  if (!order) throw new NotFoundError("Order");

  const ownsOrder = order.items.some((item) => item.product.seller.userId === sellerUserId);
  if (!ownsOrder) throw new ForbiddenError("You don't have any items in this order");

  if (input.method === "MANUAL" && !input.pickupLocation) {
    throw new ValidationError("A pickup location is required for manual delivery");
  }
  if (input.method === "PARTNER" && (!input.courier || !input.trackingCode)) {
    throw new ValidationError("A courier name and tracking code are required for partner delivery");
  }

  const delivery = await ensureDelivery(orderId);
  return db.delivery.update({
    where: { id: delivery.id },
    data: {
      method: input.method,
      pickupLocation: input.pickupLocation ?? null,
      deliveryFee: input.deliveryFee ?? null,
      courier: input.courier ?? null,
      trackingCode: input.trackingCode ?? null,
      estimatedAt: input.estimatedAt ?? null,
    },
  });
}

export function getDeliveryForOrder(orderId: string) {
  return db.delivery.findUnique({ where: { orderId }, include: { events: { orderBy: { createdAt: "asc" } }, agent: true } });
}
