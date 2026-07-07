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
