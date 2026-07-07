import "server-only";
import { db } from "@/lib/db";

export async function saveProduct(userId: string, productId: string) {
  const existing = await db.savedProduct.findUnique({ where: { userId_productId: { userId, productId } } });
  if (existing) return existing;

  const [saved] = await db.$transaction([
    db.savedProduct.create({ data: { userId, productId } }),
    db.product.update({ where: { id: productId }, data: { likeCount: { increment: 1 } } }),
    db.productEvent.create({ data: { productId, userId, type: "SAVE" } }),
  ]);
  return saved;
}

export async function unsaveProduct(userId: string, productId: string) {
  const { count } = await db.savedProduct.deleteMany({ where: { userId, productId } });
  if (count === 0) return;

  await db.$transaction([
    db.product.update({ where: { id: productId }, data: { likeCount: { decrement: 1 } } }),
    db.productEvent.create({ data: { productId, userId, type: "UNSAVE" } }),
  ]);
}

export function listSavedProducts(userId: string) {
  return db.savedProduct.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { orderBy: { position: "asc" }, take: 1 },
          seller: { select: { storeName: true, businessName: true, ratingAverage: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isProductSaved(userId: string, productId: string) {
  const saved = await db.savedProduct.findUnique({ where: { userId_productId: { userId, productId } } });
  return saved !== null;
}

/** For product-card rendering: which of these product ids has this buyer already saved. */
export async function getSavedProductIds(userId: string, productIds: string[]) {
  if (productIds.length === 0) return new Set<string>();
  const rows = await db.savedProduct.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });
  return new Set(rows.map((row) => row.productId));
}
