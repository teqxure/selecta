import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import type { NotificationEventName } from "@/services/notifications/events";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * The single, centralized order state machine. Nothing anywhere in the
 * codebase should call `db.order.update({ data: { status } })` directly —
 * every transition, from every actor (system webhook, seller, buyer,
 * admin), goes through `transitionOrderStatus` (or `transitionOrderStatusInTx`
 * when it needs to be atomic with other writes, e.g. a payment
 * confirmation). That's what makes "a completed order cannot become
 * cancelled" an actual guarantee instead of a convention someone can
 * forget to check.
 */
export type OrderActorType = "SYSTEM" | "SELLER" | "BUYER" | "ADMIN";

export interface OrderActor {
  type: OrderActorType;
  /** The acting user's id — required for every type except SYSTEM (webhook/internal-driven transitions have no user). */
  userId?: string;
}

/**
 * The full graph of transitions that are ever legal, for any actor. If an
 * edge isn't listed here, it is impossible — full stop, no admin
 * exception. This is what actually enforces "a completed order cannot
 * become cancelled": CANCELLED simply isn't reachable from COMPLETED.
 *
 * DISPUTED is reachable from every operational status (including
 * COMPLETED, for post-delivery buyer-protection claims) and resolves
 * either back into the normal flow (dispute closed, no action) or into a
 * financial terminal state (COMPLETED via release, REFUNDED via refund).
 */
const FORWARD_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["AWAITING_PAYMENT", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "DISPUTED"],
  PROCESSING: ["READY_FOR_PICKUP", "IN_TRANSIT", "CANCELLED", "DISPUTED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED", "DISPUTED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED", "DISPUTED"],
  DELIVERED: ["COMPLETED", "DISPUTED"],
  COMPLETED: ["DISPUTED"],
  DISPUTED: ["COMPLETED", "REFUNDED", "PAID", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED"],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * The subset of the graph above each actor type may actually drive.
 * ADMIN gets the entire graph (every edge that's legal at all) — "admin
 * override" means admin isn't limited to the narrow seller/buyer paths,
 * not that admin is exempt from the graph itself.
 */
const ACTOR_ALLOWED: Record<OrderActorType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  SYSTEM: {
    CREATED: ["AWAITING_PAYMENT"],
    AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  },
  SELLER: {
    PAID: ["PROCESSING"],
    PROCESSING: ["READY_FOR_PICKUP", "IN_TRANSIT"],
    READY_FOR_PICKUP: ["DELIVERED"],
    IN_TRANSIT: ["DELIVERED"],
  },
  BUYER: {
    PAID: ["DISPUTED"],
    PROCESSING: ["DISPUTED"],
    READY_FOR_PICKUP: ["DISPUTED"],
    IN_TRANSIT: ["DISPUTED"],
    DELIVERED: ["COMPLETED", "DISPUTED"],
    COMPLETED: ["DISPUTED"],
  },
  ADMIN: FORWARD_TRANSITIONS,
};

/** What a given actor may legally move an order to from its current status — the single source of truth for UI "next step" buttons, so they never drift from what the server will actually accept. */
export function getAllowedNextStatuses(actorType: OrderActorType, currentStatus: OrderStatus): OrderStatus[] {
  return ACTOR_ALLOWED[actorType][currentStatus] ?? [];
}

const STATUS_NOTIFICATION_COPY: Partial<Record<OrderStatus, string>> = {
  PAID: "Your order has been paid for and is being prepared.",
  PROCESSING: "Your order is being prepared by the seller.",
  READY_FOR_PICKUP: "Your order is ready for pickup.",
  IN_TRANSIT: "Your order has shipped and is on its way.",
  DELIVERED: "Your order has been delivered.",
  COMPLETED: "Your order is complete.",
  CANCELLED: "Your order has been cancelled.",
  DISPUTED: "A dispute has been opened on your order.",
  REFUNDED: "Your order has been refunded.",
};

/** Only statuses with a dedicated templated email; everything else falls back to ORDER_STATUS_CHANGED (in-app only). PAID is also reachable directly from payment.service.ts's webhook path, which notifies separately — this covers the outer wrapper's own callers. */
const STATUS_EVENT: Partial<Record<OrderStatus, NotificationEventName>> = {
  PAID: "ORDER_PAID",
  IN_TRANSIT: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
  COMPLETED: "ORDER_COMPLETED",
};

interface TransitionOptions {
  note?: string;
  /** Suppress the buyer notification — used when a caller sends its own, more specific message (e.g. dispute resolution). */
  skipNotification?: boolean;
}

async function loadOrderForTransition(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { seller: true } } } } },
  });
  if (!order) throw new NotFoundError("Order");
  return order;
}

function assertActorMayAct(
  order: Awaited<ReturnType<typeof loadOrderForTransition>>,
  actor: OrderActor,
) {
  if (actor.type === "BUYER") {
    if (!actor.userId || order.buyerId !== actor.userId) throw new ForbiddenError();
  }
  if (actor.type === "SELLER") {
    const ownsOrder = order.items.some((item) => item.product.seller.userId === actor.userId);
    if (!ownsOrder) throw new ForbiddenError("You don't have any items in this order");
  }
  if ((actor.type === "ADMIN") && !actor.userId) {
    throw new ForbiddenError();
  }
}

/**
 * Core transition, callable from inside an already-open transaction so it
 * can be atomic with other writes (e.g. `confirmPaymentSuccess` moving
 * AWAITING_PAYMENT -> PAID in the same transaction that creates the
 * escrowed Transaction rows). The status change itself is a conditional
 * `updateMany({ where: { id, status: <status just read> } })` — if a
 * concurrent transition wins the race first, this one's WHERE clause
 * stops matching and it fails cleanly with a Conflict rather than
 * silently overwriting whatever the winner just set.
 */
export async function transitionOrderStatusInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  actor: OrderActor,
  nextStatus: OrderStatus,
  options: TransitionOptions = {},
) {
  const order = await loadOrderForTransition(tx, orderId);
  assertActorMayAct(order, actor);

  const allowedForActor = ACTOR_ALLOWED[actor.type][order.status] ?? [];
  if (!allowedForActor.includes(nextStatus)) {
    throw new ValidationError(`Cannot move an order from ${order.status} to ${nextStatus}`);
  }

  const claim = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: nextStatus } });
  if (claim.count === 0) {
    throw new ConflictError("This order's status changed concurrently — please refresh and try again");
  }

  await tx.orderStatusHistory.create({
    data: { orderId, status: nextStatus, actorId: actor.userId ?? null, note: options.note },
  });

  return { previousStatus: order.status, nextStatus, buyerId: order.buyerId };
}

/** Public entry point — opens its own transaction and sends the buyer notification. Use this unless you're already inside a `$transaction`. */
export async function transitionOrderStatus(
  orderId: string,
  actor: OrderActor,
  nextStatus: OrderStatus,
  options: TransitionOptions = {},
) {
  const result = await db.$transaction((tx) => transitionOrderStatusInTx(tx, orderId, actor, nextStatus, options));

  if (!options.skipNotification) {
    const message = STATUS_NOTIFICATION_COPY[nextStatus] ?? `Your order is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.`;
    await notify({
      event: STATUS_EVENT[nextStatus] ?? "ORDER_STATUS_CHANGED",
      userId: result.buyerId,
      title: "Order update",
      message,
      actionUrl: `/orders/${orderId}`,
      emailVariables: { orderId },
    });
  }

  return result;
}
