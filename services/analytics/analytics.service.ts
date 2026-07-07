import "server-only";
import { db } from "@/lib/db";

/**
 * Aggregate read layer over the denormalized Product counters and the raw
 * ProductEvent stream. Kept separate from product.service.ts because this
 * is reporting, not catalog/inventory business logic — and it's the seam
 * a future recommendation engine would read from.
 */
export async function getSellerAnalytics(sellerId: string) {
  const [totals, ordersCount] = await Promise.all([
    db.product.aggregate({
      where: { sellerId },
      _sum: { viewCount: true, likeCount: true, shareCount: true },
    }),
    db.orderItem.findMany({
      where: { product: { sellerId } },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
  ]);

  const totalViews = totals._sum.viewCount ?? 0;
  const conversionRate = totalViews > 0 ? ordersCount.length / totalViews : 0;

  return {
    totalViews,
    totalLikes: totals._sum.likeCount ?? 0,
    totalShares: totals._sum.shareCount ?? 0,
    totalOrders: ordersCount.length,
    conversionRate,
  };
}

export function getProductAnalytics(productId: string) {
  return db.product.findUnique({
    where: { id: productId },
    select: { viewCount: true, likeCount: true, shareCount: true },
  });
}

export function getMostViewedProducts(sellerId: string, limit = 5) {
  return db.product.findMany({
    where: { sellerId, status: { not: "REMOVED" } },
    orderBy: { viewCount: "desc" },
    take: limit,
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });
}

/** Category with the most sold OrderItems for this seller — "best selling category". */
export async function getBestSellingCategory(sellerId: string) {
  const soldItems = await db.orderItem.findMany({
    where: { product: { sellerId, status: "SOLD" } },
    include: { product: { include: { category: true } } },
  });
  if (soldItems.length === 0) return null;

  const byCategory = new Map<string, { name: string; count: number }>();
  for (const item of soldItems) {
    const entry = byCategory.get(item.product.categoryId) ?? { name: item.product.category.name, count: 0 };
    entry.count += item.quantity;
    byCategory.set(item.product.categoryId, entry);
  }

  return Array.from(byCategory.values()).sort((a, b) => b.count - a.count)[0];
}

/** Daily revenue for the last `days` days from this seller's RELEASED payments — bucketed in JS, not SQL. */
export async function getRevenueHistory(sellerId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await db.orderItem.findMany({
    where: {
      product: { sellerId },
      order: { payment: { status: "RELEASED" } },
      createdAt: { gte: since },
    },
    select: { unitPrice: true, quantity: true, createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const item of items) {
    const day = item.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(item.unitPrice) * item.quantity);
  }

  return Array.from(byDay.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** "Your X perform better than your Y" — compares average views per listing across categories. */
export async function getCategoryPerformanceInsight(sellerId: string) {
  const products = await db.product.findMany({
    where: { sellerId, status: { not: "REMOVED" } },
    include: { category: true },
  });
  if (products.length < 2) return null;

  const byCategory = new Map<string, { name: string; totalViews: number; count: number }>();
  for (const product of products) {
    const entry = byCategory.get(product.categoryId) ?? { name: product.category.name, totalViews: 0, count: 0 };
    entry.totalViews += product.viewCount;
    entry.count += 1;
    byCategory.set(product.categoryId, entry);
  }
  if (byCategory.size < 2) return null;

  const ranked = Array.from(byCategory.values())
    .map((c) => ({ name: c.name, avgViews: c.totalViews / c.count }))
    .sort((a, b) => b.avgViews - a.avgViews);

  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  if (best.avgViews === worst.avgViews) return null;

  return { best: best.name, worst: worst.name };
}

/** Gross value of orders placed today containing this seller's items (not necessarily released from escrow yet). */
export async function getTodayRevenue(sellerId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const items = await db.orderItem.findMany({
    where: { product: { sellerId }, order: { createdAt: { gte: startOfDay } } },
    select: { unitPrice: true, quantity: true },
  });

  return items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
}

/** "Corporate shirts are trending in Abuja" — the seller's own best-performing (category, city) pairing by views this week. */
export async function getTrendingInsight(sellerId: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const products = await db.product.findMany({
    where: { sellerId, status: "ACTIVE", updatedAt: { gte: weekAgo } },
    include: { category: true },
    orderBy: { viewCount: "desc" },
    take: 1,
  });

  const top = products[0];
  if (!top || top.viewCount === 0) return null;

  return { categoryName: top.category.name, city: top.city };
}
