import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { releaseOrderTransactions } from "@/services/payments/payment.service";
import { syncDeliveryStatus } from "@/services/logistics/delivery.service";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import type { Address } from "@/types";
import type { OrderStatus } from "@/generated/prisma/enums";

/**
 * Forward transitions a seller may drive themselves — anything not listed
 * here (payment moving CREATED/AWAITING_PAYMENT/PAID, or the terminal
 * DISPUTED/CANCELLED/COMPLETED states) is system-, buyer-, or
 * admin-driven only. One Order can span multiple sellers, so any seller
 * with at least one item in the order may advance it — see
 * `advanceOrderStatusAsSeller`.
 */
const SELLER_ADVANCEABLE_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PAID: ["PROCESSING"],
  PROCESSING: ["READY_FOR_PICKUP", "IN_TRANSIT"],
  READY_FOR_PICKUP: ["DELIVERED"],
  IN_TRANSIT: ["DELIVERED"],
};

interface OrderLineInput {
  productId: string;
  quantity: number;
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

    const totalAmount = lines.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId)!;
      return sum + Number(product.price) * line.quantity;
    }, 0);

    return tx.order.create({
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
              unitPrice: product.price,
            };
          }),
        },
      },
      include: { items: { include: { product: { include: { seller: true } } } } },
    });
  });

  const itemsBySeller = new Map<string, { title: string }[]>();
  for (const item of order.items) {
    const sellerUserId = item.product.seller.userId;
    const entry = itemsBySeller.get(sellerUserId) ?? [];
    entry.push({ title: item.product.title });
    itemsBySeller.set(sellerUserId, entry);
  }

  await Promise.all(
    Array.from(itemsBySeller.entries()).map(([sellerUserId, items]) => {
      const message =
        items.length === 1
          ? `"${items[0].title}" just sold — check your orders for pickup details.`
          : `${items.length} items just sold, including "${items[0].title}" — check your orders for pickup details.`;
      return createNotification(sellerUserId, "ORDER", "You received an order", message);
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
 */
export async function advanceOrderStatusAsSeller(orderId: string, sellerUserId: string, nextStatus: OrderStatus, note?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { seller: true } } } } },
  });
  if (!order) throw new NotFoundError("Order");

  const ownsOrder = order.items.some((item) => item.product.seller.userId === sellerUserId);
  if (!ownsOrder) throw new ForbiddenError("You don't have any items in this order");

  const allowed = SELLER_ADVANCEABLE_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new ValidationError(`Cannot move an order from ${order.status} to ${nextStatus}`);
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await tx.orderStatusHistory.create({ data: { orderId, status: nextStatus, actorId: sellerUserId, note } });
  });

  await syncDeliveryStatus(orderId, nextStatus, note);

  await createNotification(
    order.buyerId,
    "ORDER",
    "Order update",
    `Your order #${orderId.slice(-8)} is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.`,
  );

  return nextStatus;
}

/**
 * The buyer confirming they received their order — the trigger that
 * releases every seller's escrowed Transaction for this order into their
 * available wallet balance. This is the "delivery confirmation" half of
 * escrow release; the other half is `adminSetOrderStatus` below.
 */
export async function confirmDeliveryAsBuyer(orderId: string, buyerId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");
  if (order.buyerId !== buyerId) throw new ForbiddenError();
  if (order.status !== "DELIVERED") {
    throw new ValidationError("Only orders marked delivered can be confirmed received");
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "COMPLETED" } });
    await tx.orderStatusHistory.create({
      data: { orderId, status: "COMPLETED", actorId: buyerId, note: "Delivery confirmed by buyer" },
    });
  });

  await releaseOrderTransactions(orderId, buyerId);

  return "COMPLETED" as const;
}

/**
 * Admin override — can force any status, including completing an order
 * (and therefore releasing escrow) without waiting on the buyer, e.g. to
 * resolve a dispute or unblock a stuck order. Every override is audited.
 */
export async function adminSetOrderStatus(orderId: string, adminId: string, nextStatus: OrderStatus, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: nextStatus } });
    await tx.orderStatusHistory.create({ data: { orderId, status: nextStatus, actorId: adminId, note } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "ORDER_STATUS_OVERRIDDEN",
        entityType: "Order",
        entityId: orderId,
        metadata: { from: order.status, to: nextStatus, note } as object,
      },
    });
  });

  if (nextStatus === "COMPLETED" && order.status !== "COMPLETED") {
    await releaseOrderTransactions(orderId, adminId);
  }

  await syncDeliveryStatus(orderId, nextStatus, note);

  await createNotification(
    order.buyerId,
    "ORDER",
    "Order update",
    `Your order #${orderId.slice(-8)} is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.`,
  );

  return nextStatus;
}
