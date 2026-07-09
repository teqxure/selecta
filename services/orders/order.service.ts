import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import { releaseOrderTransactions } from "@/services/payments/payment.service";
import { syncDeliveryStatus } from "@/services/logistics/delivery.service";
import { transitionOrderStatus } from "@/services/orders/order-state-machine";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type { Address } from "@/types";
import type { OrderStatus } from "@/generated/prisma/enums";

interface OrderLineInput {
  productId: string;
  quantity: number;
  /** Set only for a checkout created from an accepted Offer negotiation — the unit price is re-derived from that offer's own record below, never trusted from the caller. */
  offerId?: string;
}

export async function createOrder(buyerId: string, lines: OrderLineInput[], shippingAddress: Address) {
  if (lines.length === 0) throw new ValidationError("An order must contain at least one item");

  const order = await db.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: lines.map((line) => line.productId) } },
    });

    if (products.length !== lines.length) {
      throw new ValidationError("One or more products in this order no longer exist");
    }

    const offerLines = lines.filter((line) => line.offerId);
    const offers =
      offerLines.length > 0
        ? await tx.offer.findMany({ where: { id: { in: offerLines.map((line) => line.offerId!) } } })
        : [];

    const unitPriceFor = (line: OrderLineInput, product: (typeof products)[number]) => {
      if (!line.offerId) return product.price;
      const offer = offers.find((o) => o.id === line.offerId);
      if (!offer || offer.buyerId !== buyerId || offer.productId !== line.productId || offer.status !== "ACCEPTED" || offer.orderId) {
        throw new ValidationError("This offer is no longer valid for checkout");
      }
      return offer.amount;
    };

    const totalAmount = lines.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId)!;
      return sum + Number(unitPriceFor(line, product)) * line.quantity;
    }, 0);

    const created = await tx.order.create({
      data: {
        buyerId,
        totalAmount,
        shippingAddress: shippingAddress as object,
        items: {
          create: lines.map((line) => {
            const product = products.find((p) => p.id === line.productId)!;
            return {
              productId: line.productId,
              quantity: line.quantity,
              unitPrice: unitPriceFor(line, product),
            };
          }),
        },
      },
      include: { items: { include: { product: { include: { seller: true } } } } },
    });

    for (const line of offerLines) {
      await tx.offer.update({ where: { id: line.offerId! }, data: { orderId: created.id } });
    }

    return created;
  });

  const itemsBySeller = new Map<string, { title: string; storeName: string }[]>();
  for (const item of order.items) {
    const sellerUserId = item.product.seller.userId;
    const entry = itemsBySeller.get(sellerUserId) ?? [];
    entry.push({ title: item.product.title, storeName: item.product.seller.storeName ?? item.product.seller.businessName });
    itemsBySeller.set(sellerUserId, entry);
  }

  await Promise.all(
    Array.from(itemsBySeller.entries()).map(([sellerUserId, items]) => {
      const message =
        items.length === 1
          ? `"${items[0].title}" just sold — check your orders for pickup details.`
          : `${items.length} items just sold, including "${items[0].title}" — check your orders for pickup details.`;
      return notify({
        event: "SELLER_NEW_ORDER",
        userId: sellerUserId,
        title: "You received an order",
        message,
        actionUrl: `/seller/orders/${order.id}`,
        emailVariables: { orderId: order.id, storeName: items[0].storeName },
      });
    }),
  );

  return order;
}

const ORDER_DETAIL_INCLUDE = {
  buyer: true,
  items: { include: { product: { include: { images: { orderBy: { position: "asc" as const }, take: 1 }, seller: true } } } },
  payment: true,
  transactions: true,
  delivery: { include: { events: { orderBy: { createdAt: "asc" as const } } } },
  statusHistory: { orderBy: { createdAt: "asc" as const }, include: { actor: true } },
} satisfies Parameters<typeof db.order.findUnique>[0]["include"];

export async function getOrderById(id: string) {
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new NotFoundError("Order");
  return order;
}

async function getOrderDetail(id: string) {
  const order = await db.order.findUnique({ where: { id }, include: ORDER_DETAIL_INCLUDE });
  if (!order) throw new NotFoundError("Order");
  return order;
}

export async function getOrderDetailForBuyer(orderId: string, buyerId: string) {
  const order = await getOrderDetail(orderId);
  if (order.buyerId !== buyerId) throw new ForbiddenError();
  return order;
}

export async function getOrderDetailForSeller(orderId: string, sellerUserId: string) {
  const order = await getOrderDetail(orderId);
  const ownsOrder = order.items.some((item) => item.product.seller.userId === sellerUserId);
  if (!ownsOrder) throw new ForbiddenError();
  return order;
}

export async function getOrderDetailForAdmin(orderId: string) {
  return getOrderDetail(orderId);
}

export function listOrdersForBuyer(buyerId: string) {
  return db.order.findMany({
    where: { buyerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listOrdersForSeller(sellerId: string) {
  return db.order.findMany({
    where: { items: { some: { product: { sellerId } } } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Distinct buyers who've ordered from this seller, with order count/total
 * spent per buyer — built entirely from existing Order/OrderItem data, no
 * new schema. `orderCount > 1` is what "repeat customer" means here.
 */
export async function listCustomersForSeller(sellerId: string) {
  const orders = await db.order.findMany({
    where: { items: { some: { product: { sellerId } } } },
    include: { buyer: true, items: { where: { product: { sellerId } }, include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  const byBuyer = new Map<
    string,
    { buyer: (typeof orders)[number]["buyer"]; orderCount: number; totalSpent: number; lastOrderAt: Date }
  >();

  for (const order of orders) {
    const lineTotal = order.items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const existing = byBuyer.get(order.buyerId);
    if (existing) {
      existing.orderCount += 1;
      existing.totalSpent += lineTotal;
      if (order.createdAt > existing.lastOrderAt) existing.lastOrderAt = order.createdAt;
    } else {
      byBuyer.set(order.buyerId, {
        buyer: order.buyer,
        orderCount: 1,
        totalSpent: lineTotal,
        lastOrderAt: order.createdAt,
      });
    }
  }

  return Array.from(byBuyer.values()).sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
}

/** Orders containing this seller's items that haven't reached a terminal state yet. */
export function getPendingOrdersCountForSeller(sellerId: string) {
  return db.order.count({
    where: {
      items: { some: { product: { sellerId } } },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
  });
}

/**
 * A seller moving their fulfillment forward (PAID -> PROCESSING ->
 * READY_FOR_PICKUP/IN_TRANSIT -> DELIVERED). Any seller with items in the
 * order may drive it — Order.status is shared across all sellers in a
 * multi-seller order, there's no per-seller sub-status in this schema.
 * All validation (ownership, legal transition, race-safety) lives in
 * `transitionOrderStatus` — this is a thin, named entry point onto it.
 */
export async function advanceOrderStatusAsSeller(orderId: string, sellerUserId: string, nextStatus: OrderStatus, note?: string) {
  await transitionOrderStatus(orderId, { type: "SELLER", userId: sellerUserId }, nextStatus, { note });
  await syncDeliveryStatus(orderId, nextStatus, note);
  return nextStatus;
}

/**
 * The buyer confirming they received their order — the trigger that
 * releases every seller's escrowed Transaction for this order into their
 * available wallet balance. This is the "delivery confirmation" half of
 * escrow release; the other half is `adminSetOrderStatus` below.
 */
export async function confirmDeliveryAsBuyer(orderId: string, buyerId: string) {
  await transitionOrderStatus(
    orderId,
    { type: "BUYER", userId: buyerId },
    "COMPLETED",
    { note: "Delivery confirmed by buyer" },
  );

  await releaseOrderTransactions(orderId, buyerId);

  return "COMPLETED" as const;
}

/**
 * Admin override — can drive any transition the state machine considers
 * legal at all (see order-state-machine.ts's FORWARD_TRANSITIONS), e.g.
 * to resolve a dispute or unblock a stuck order — but never a transition
 * that isn't in that graph (a completed order still can't become
 * cancelled, even for an admin). Every override is audited in addition to
 * the ordinary status-history record every transition gets.
 */
export async function adminSetOrderStatus(orderId: string, adminId: string, nextStatus: OrderStatus, note?: string) {
  const { previousStatus } = await transitionOrderStatus(orderId, { type: "ADMIN", userId: adminId }, nextStatus, { note });

  await db.auditLog.create({
    data: {
      actorId: adminId,
      action: "ORDER_STATUS_OVERRIDDEN",
      entityType: "Order",
      entityId: orderId,
      metadata: { from: previousStatus, to: nextStatus, note } as object,
    },
  });

  if (nextStatus === "COMPLETED") {
    await releaseOrderTransactions(orderId, adminId);
  }

  await syncDeliveryStatus(orderId, nextStatus, note);

  return nextStatus;
}
