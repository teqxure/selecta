import "server-only";
import { db } from "@/lib/db";
import { getStoreHealthScore } from "@/services/insights/seller-insight.service";
import { computeBulkQualityScores } from "@/services/insights/product-insight.service";

/**
 * Admin-facing half of the intelligence foundation — platform-wide rollups
 * built on the same StoreHealthScore/quality-score logic sellers see, plus
 * category/retention aggregates from existing ProductEvent/Transaction/
 * SellerProfile data. No new tracking, no seller-identifying data beyond
 * what Super Admin can already see elsewhere in the admin console.
 */

export interface MarketplaceHealthOverview {
  averageHealthScore: number;
  sellersScored: number;
  distribution: { excellent: number; good: number; fair: number; needsImprovement: number };
}

/** Scores a bounded, most-recently-active sample of sellers rather than the entire marketplace on every admin page load — cheap enough for a dashboard, still representative. */
export async function getMarketplaceHealthOverview(sampleSize = 100): Promise<MarketplaceHealthOverview> {
  const sellers = await db.sellerProfile.findMany({
    where: { onboardingCompletedAt: { not: null } },
    orderBy: { updatedAt: "desc" },
    take: sampleSize,
    select: { id: true },
  });
  if (sellers.length === 0) return { averageHealthScore: 0, sellersScored: 0, distribution: { excellent: 0, good: 0, fair: 0, needsImprovement: 0 } };

  const scores = await Promise.all(sellers.map((s) => getStoreHealthScore(s.id)));
  const distribution = { excellent: 0, good: 0, fair: 0, needsImprovement: 0 };
  for (const result of scores) {
    if (result.label === "Excellent") distribution.excellent += 1;
    else if (result.label === "Good") distribution.good += 1;
    else if (result.label === "Fair") distribution.fair += 1;
    else distribution.needsImprovement += 1;
  }

  return {
    averageHealthScore: Math.round(scores.reduce((sum, r) => sum + r.overall, 0) / scores.length),
    sellersScored: scores.length,
    distribution,
  };
}

export interface SellerPerformanceRow {
  sellerId: string;
  storeName: string;
  revenue: number;
  healthScore: number;
}

/** Ranked by real released revenue in the window — never a curated or self-reported list. */
export async function getTopSellers(days = 30, limit = 10): Promise<SellerPerformanceRow[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.transaction.groupBy({
    by: ["sellerId"],
    where: { createdAt: { gte: since }, status: "RELEASED" },
    _sum: { sellerAmount: true },
    orderBy: { _sum: { sellerAmount: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const sellers = await db.sellerProfile.findMany({ where: { id: { in: rows.map((r) => r.sellerId) } }, select: { id: true, storeName: true, businessName: true } });
  const byId = new Map(sellers.map((s) => [s.id, s]));

  const healthScores = await Promise.all(rows.map((r) => getStoreHealthScore(r.sellerId)));
  const healthById = new Map(rows.map((r, i) => [r.sellerId, healthScores[i].overall]));

  return rows
    .map((row) => {
      const seller = byId.get(row.sellerId);
      if (!seller) return null;
      return { sellerId: seller.id, storeName: seller.storeName ?? seller.businessName, revenue: Number(row._sum.sellerAmount ?? 0), healthScore: healthById.get(row.sellerId) ?? 0 };
    })
    .filter((r): r is SellerPerformanceRow => r !== null);
}

export interface CategoryTrendRow {
  categoryId: string;
  categoryName: string;
  currentViews: number;
  priorViews: number;
  growthPct: number | null;
}

/** Growing/weak categories by real VIEW-event velocity, current vs prior window of the same length — not a lifetime total, so a category that was always big but is now flat doesn't show as "growing." */
export async function getCategoryTrends(days = 30, limit = 8): Promise<{ growing: CategoryTrendRow[]; weak: CategoryTrendRow[]; top: CategoryTrendRow[] }> {
  const since = new Date(Date.now() - days * 86_400_000);
  const priorSince = new Date(Date.now() - days * 2 * 86_400_000);

  const [currentEvents, priorEvents, categories] = await Promise.all([
    db.productEvent.findMany({ where: { type: "VIEW", createdAt: { gte: since } }, select: { product: { select: { categoryId: true } } } }),
    db.productEvent.findMany({ where: { type: "VIEW", createdAt: { gte: priorSince, lt: since } }, select: { product: { select: { categoryId: true } } } }),
    db.category.findMany({ select: { id: true, name: true } }),
  ]);
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const currentCounts = new Map<string, number>();
  for (const event of currentEvents) currentCounts.set(event.product.categoryId, (currentCounts.get(event.product.categoryId) ?? 0) + 1);
  const priorCounts = new Map<string, number>();
  for (const event of priorEvents) priorCounts.set(event.product.categoryId, (priorCounts.get(event.product.categoryId) ?? 0) + 1);

  const allCategoryIds = new Set([...currentCounts.keys(), ...priorCounts.keys()]);
  const rows: CategoryTrendRow[] = Array.from(allCategoryIds)
    .map((categoryId) => {
      const currentViews = currentCounts.get(categoryId) ?? 0;
      const priorViews = priorCounts.get(categoryId) ?? 0;
      return {
        categoryId,
        categoryName: nameById.get(categoryId) ?? "Unknown",
        currentViews,
        priorViews,
        growthPct: priorViews > 0 ? ((currentViews - priorViews) / priorViews) * 100 : null,
      };
    })
    .filter((r) => r.currentViews + r.priorViews > 0);

  const top = [...rows].sort((a, b) => b.currentViews - a.currentViews).slice(0, limit);
  const growing = rows.filter((r) => r.growthPct !== null && r.growthPct > 20).sort((a, b) => (b.growthPct ?? 0) - (a.growthPct ?? 0)).slice(0, limit);
  const weak = rows.filter((r) => r.growthPct !== null && r.growthPct < -20).sort((a, b) => (a.growthPct ?? 0) - (b.growthPct ?? 0)).slice(0, limit);

  return { growing, weak, top };
}

export interface SellerRetentionResult {
  eligibleSellers: number;
  activeSellers: number;
  retentionRate: number;
}

/** % of sellers onboarded before the window who transacted (had at least one Transaction) within it — a real activity-based retention proxy, not a login-based one (no session-history retention concept exists in this schema). */
export async function getSellerRetention(days = 30): Promise<SellerRetentionResult> {
  const since = new Date(Date.now() - days * 86_400_000);

  const eligibleSellers = await db.sellerProfile.findMany({
    where: { onboardingCompletedAt: { lt: since } },
    select: { id: true },
  });
  if (eligibleSellers.length === 0) return { eligibleSellers: 0, activeSellers: 0, retentionRate: 0 };

  const eligibleIds = eligibleSellers.map((s) => s.id);
  const activeSellerIds = await db.transaction.findMany({
    where: { sellerId: { in: eligibleIds }, createdAt: { gte: since } },
    select: { sellerId: true },
    distinct: ["sellerId"],
  });

  return {
    eligibleSellers: eligibleSellers.length,
    activeSellers: activeSellerIds.length,
    retentionRate: activeSellerIds.length / eligibleSellers.length,
  };
}

export interface ProductQualityTrendRow {
  month: string;
  averageScore: number;
  sampleSize: number;
}

/** Average product quality score bucketed by listing creation month — shows whether newer listings are better-formed than older ones. Quality isn't stored historically, so this scores each product's CURRENT state, grouped by when it was created. */
export async function getProductQualityTrend(monthsBack = 6): Promise<ProductQualityTrendRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - (monthsBack - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const scores = await computeBulkQualityScores({ status: { not: "REMOVED" }, createdAt: { gte: since } });
  const products = await db.product.findMany({ where: { id: { in: Array.from(scores.keys()) } }, select: { id: true, createdAt: true } });
  const createdAtById = new Map(products.map((p) => [p.id, p.createdAt]));

  const buckets = new Map<string, { total: number; count: number }>();
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(since);
    date.setMonth(date.getMonth() + i);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, { total: 0, count: 0 });
  }

  for (const [productId, result] of scores) {
    const createdAt = createdAtById.get(productId);
    if (!createdAt) continue;
    const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.total += result.score;
    bucket.count += 1;
  }

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      month: new Date(year, month, 1).toLocaleDateString("en-NG", { month: "short", year: "2-digit" }),
      averageScore: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
      sampleSize: bucket.count,
    };
  });
}
