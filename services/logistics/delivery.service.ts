import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { transitionOrderStatus } from "@/services/orders/order-state-machine";
import type { DeliveryMethod, DeliveryStatus, OrderStatus, DeliveryFulfillmentType, ProofMethod } from "@/generated/prisma/enums";
import type { DeliveryQuote } from "@/services/logistics/delivery-engine.service";

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

/**
 * Persists the *final chosen* delivery-engine quote at checkout time —
 * only called for single-seller orders (the common case). `Delivery` stays
 * 1:1 with `Order`, so a genuine multi-seller order with per-seller quotes
 * can't have all of them represented here yet; this is the documented seam
 * where `Delivery` would need to become 1:many (keyed by seller) for true
 * split delivery — a deliberate future-work boundary, not an oversight.
 */
export async function setDeliveryQuote(
  orderId: string,
  quote: DeliveryQuote,
  fulfillmentType: DeliveryFulfillmentType,
  finalFee: number,
) {
  const delivery = await ensureDelivery(orderId);
  return db.delivery.update({
    where: { id: delivery.id },
    data: {
      distanceKm: quote.distanceKm,
      zoneLabel: quote.zoneLabel,
      estimatedMinutes: quote.estimatedMinutes,
      fulfillmentType,
      deliveryFee: finalFee,
      method: fulfillmentType === "PICKUP" ? "MANUAL" : delivery.method,
    },
  });
}

const RIDER_ADVANCEABLE_STATUSES: DeliveryStatus[] = ["PICKED_UP", "IN_TRANSIT", "ON_THE_WAY", "NEARBY"];

/** A rider moving their own assigned delivery through the granular in-transit states — separate from the DELIVERED/proof step below. */
export async function advanceDeliveryStatusByRider(riderUserId: string, deliveryId: string, nextStatus: DeliveryStatus, note?: string) {
  if (!RIDER_ADVANCEABLE_STATUSES.includes(nextStatus)) {
    throw new ValidationError(`A rider cannot set delivery status to ${nextStatus} directly`);
  }

  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new NotFoundError("Delivery");
  if (delivery.agentId !== riderUserId) throw new ForbiddenError("You aren't the assigned rider for this delivery");

  return db.$transaction(async (tx) => {
    const updated = await tx.delivery.update({ where: { id: deliveryId }, data: { status: nextStatus } });
    await tx.deliveryEvent.create({ data: { deliveryId, status: nextStatus, note } });
    return updated;
  });
}

export interface ProofOfDeliveryInput {
  method: ProofMethod;
  pin?: string;
  photoUrl?: string;
  signatureUrl?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Rider hand-off confirmation — records whichever proof fields match the
 * chosen method, then drives the Order forward to DELIVERED through the
 * central state machine (via the RIDER actor type) so the buyer
 * notification and OrderStatusHistory stay the single source of truth,
 * exactly as they already are for the seller-driven path.
 */
export async function confirmDeliveryWithProof(riderUserId: string, deliveryId: string, proof: ProofOfDeliveryInput) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new NotFoundError("Delivery");
  if (delivery.agentId !== riderUserId) throw new ForbiddenError("You aren't the assigned rider for this delivery");
  if (delivery.proofConfirmedAt) throw new ValidationError("This delivery has already been confirmed");

  await db.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        proofMethod: proof.method,
        proofPin: proof.pin ?? null,
        proofPhotoUrl: proof.photoUrl ?? null,
        proofSignatureUrl: proof.signatureUrl ?? null,
        proofNotes: proof.notes ?? null,
        proofLatitude: proof.latitude ?? null,
        proofLongitude: proof.longitude ?? null,
        proofConfirmedAt: new Date(),
      },
    });
    await tx.deliveryEvent.create({ data: { deliveryId, status: "DELIVERED", note: `Proof of delivery: ${proof.method}` } });

    const stillHasOtherActive = await tx.delivery.count({
      where: { agentId: riderUserId, id: { not: deliveryId }, status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } },
    });
    await tx.riderProfile.update({
      where: { userId: riderUserId },
      data: { status: stillHasOtherActive > 0 ? "ON_DELIVERY" : "AVAILABLE", totalDeliveries: { increment: 1 } },
    });
  });

  await transitionOrderStatus(delivery.orderId, { type: "RIDER", userId: riderUserId }, "DELIVERED", {
    note: `Delivered by rider (proof: ${proof.method})`,
  });

  return db.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
}

/** Read-only polling endpoint for buyer/seller/HQ live tracking — client re-fetches every few seconds, no push infra required. */
export async function getDeliveryTracking(orderId: string) {
  const delivery = await db.delivery.findUnique({
    where: { orderId },
    include: {
      agent: { include: { riderProfile: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!delivery) throw new NotFoundError("Delivery");

  return {
    status: delivery.status,
    fulfillmentType: delivery.fulfillmentType,
    estimatedAt: delivery.estimatedAt,
    deliveredAt: delivery.deliveredAt,
    trackingCode: delivery.trackingCode,
    courier: delivery.courier,
    rider: delivery.agent
      ? {
          name: `${delivery.agent.firstName} ${delivery.agent.lastName}`,
          latitude: delivery.agent.riderProfile?.latitude ?? null,
          longitude: delivery.agent.riderProfile?.longitude ?? null,
          locationUpdatedAt: delivery.agent.riderProfile?.locationUpdatedAt ?? null,
        }
      : null,
    events: delivery.events.map((event) => ({ status: event.status, note: event.note, createdAt: event.createdAt })),
  };
}
