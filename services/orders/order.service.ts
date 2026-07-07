import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { Address } from "@/types";

interface OrderLineInput {
  productId: string;
  quantity: number;
}

export async function createOrder(buyerId: string, lines: OrderLineInput[], shippingAddress: Address) {
  if (lines.length === 0) throw new ValidationError("An order must contain at least one item");

  return db.$transaction(async (tx) => {
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
      include: { items: true },
    });
  });
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
