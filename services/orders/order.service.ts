import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Address } from "@/types";

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

export async function getOrderById(id: string) {
  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) throw new NotFoundError("Order");
  return order;
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
      status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] },
    },
  });
}
