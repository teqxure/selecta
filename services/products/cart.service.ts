import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function addToCart(userId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, status: "ACTIVE" } });
  if (!product) throw new NotFoundError("Product");

  return db.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
}

export async function removeFromCart(userId: string, productId: string) {
  await db.cartItem.deleteMany({ where: { userId, productId } });
}

export function getCartItemCount(userId: string) {
  return db.cartItem.count({ where: { userId } });
}

export function listCartItems(userId: string) {
  return db.cartItem.findMany({
    where: { userId },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 }, seller: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function clearCart(userId: string) {
  await db.cartItem.deleteMany({ where: { userId } });
}

export async function assertCartItemsStillAvailable(userId: string) {
  const items = await listCartItems(userId);
  const unavailable = items.filter((item) => item.product.status !== "ACTIVE");
  if (unavailable.length > 0) {
    throw new ValidationError(`"${unavailable[0].product.title}" is no longer available — remove it to continue`);
  }
  return items;
}
