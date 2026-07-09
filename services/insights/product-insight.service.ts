import "server-only";
import { db } from "@/lib/db";
import { getSuggestedPriceRange } from "@/services/products/product.service";
import { getActiveBoostProductIds } from "@/services/monetization/boost.service";

/**
 * Everything here reads from tracking that already exists — ProductEvent
 * (VIEW/SAVE/SHARE/CONTACT_SELLER/IMPRESSION), OrderItem, Product's own
 * fields. Nothing new is counted; this is a read/scoring layer on top of
 * Phase-6/7's SearchService and monetization tracking. Intended as the
 * single place a future AI layer (or any UI) reads product intelligence
 * from — never query Product/ProductEvent raw for "how good is this
 * listing" logic outside this file.
 */

const MIN_EVENTS_FOR_ENGAGEMENT_SCORING = 5;

export interface ProductQualityBreakdown {
  images: number;
  description: number;
  title: number;
  price: number;
  category: number;
  engagement: number;
  conversion: number;
}

export interface ProductQualityResult {
  score: number;
  breakdown: ProductQualityBreakdown;
  suggestions: string[];
  hasEnoughEngagementData: boolean;
}

/**
 * 0-100, from 7 measurable factors (weights sum to 100). Engagement and
 * conversion default to a neutral mid-score (not 0) below
 * MIN_EVENTS_FOR_ENGAGEMENT_SCORING views — a brand-new listing hasn't
 * earned a bad score, it just doesn't have data yet (`hasEnoughEngagementData`
 * tells the UI to say so rather than imply the listing is underperforming).
 */
export async function getProductQualityScore(productId: string): Promise<ProductQualityResult> {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
    include: { images: true },
  });

  const [orderCount, saveCount] = await Promise.all([
    db.orderItem.count({ where: { productId, order: { status: { notIn: ["CANCELLED", "REFUNDED"] } } } }),
    db.productEvent.count({ where: { productId, type: "SAVE" } }),
  ]);

  const breakdown: ProductQualityBreakdown = {
    images: Math.min(product.images.length, 6) / 6 * 20,
    description: scoreDescription(product.description),
    title: scoreTitle(product.title),
    price: Number(product.price) > 0 ? 10 : 0,
    category: product.subcategoryId ? 10 : product.categoryId ? 6 : 0,
    engagement: 0,
    conversion: 0,
  };

  const hasEnoughEngagementData = product.viewCount >= MIN_EVENTS_FOR_ENGAGEMENT_SCORING;
  if (hasEnoughEngagementData) {
    // log-scaled so a handful of extra views doesn't swing the score wildly at the low end.
    breakdown.engagement = Math.min(Math.log10(product.viewCount + saveCount + 1) * 8, 15);
    const conversionRate = orderCount / product.viewCount;
    breakdown.conversion = Math.min(conversionRate * 400, 20); // 5% conversion = full marks
  } else {
    breakdown.engagement = 7.5; // neutral half-credit — not enough traffic to judge yet
    breakdown.conversion = 10;
  }

  const score = Math.round(Object.values(breakdown).reduce((sum, v) => sum + v, 0));

  const suggestions: string[] = [];
  if (breakdown.images < 14) suggestions.push("Add more photos — listings with 4-6+ photos build more buyer trust.");
  if (breakdown.description < 10) suggestions.push("Write a fuller description covering condition, fit, and why it's worth buying.");
  if (breakdown.title < 7) suggestions.push("Use a clear, specific title (brand + item + standout detail).");
  if (breakdown.category < 10) suggestions.push("Pick a specific subcategory so buyers searching narrowly can find it.");
  if (breakdown.price === 0) suggestions.push("Set a price before this can attract buyers.");
  if (hasEnoughEngagementData && breakdown.conversion < 5 && orderCount === 0) {
    suggestions.push("Getting views but no sales yet — consider adjusting the price or adding more photos.");
  }

  return { score: Math.min(score, 100), breakdown, suggestions, hasEnoughEngagementData };
}

function scoreDescription(description: string | null) {
  if (!description || description.trim().length === 0) return 0;
  const length = description.trim().length;
  if (length < 20) return 5;
  if (length < 50) return 10;
  return 15;
}

function scoreTitle(title: string) {
  if (!title || title === "Untitled listing") return 0;
  const length = title.trim().length;
  if (length < 10) return 4;
  if (length > 100) return 6;
  return 10;
}

/** Bulk version for list pages — avoids an N+1 by batching the two count queries across all products at once. */
export function getProductQualityScoresForSeller(sellerId: string): Promise<Map<string, ProductQualityResult>> {
  return computeBulkQualityScores({ sellerId, status: { not: "REMOVED" } });
}

/** Same bulk scorer, scoped by an arbitrary product filter — used by MarketplaceInsightService for marketplace-wide quality trends, so the scoring formula lives in exactly one place. */
export async function computeBulkQualityScores(where: NonNullable<Parameters<typeof db.product.findMany>[0]>["where"]): Promise<Map<string, ProductQualityResult>> {
  const products = await db.product.findMany({ where, include: { images: true } });
  if (products.length === 0) return new Map();

  const productIds = products.map((p) => p.id);
  const [orderCounts, saveCounts] = await Promise.all([
    db.orderItem.groupBy({ by: ["productId"], where: { productId: { in: productIds }, order: { status: { notIn: ["CANCELLED", "REFUNDED"] } } }, _count: true }),
    db.productEvent.groupBy({ by: ["productId"], where: { productId: { in: productIds }, type: "SAVE" }, _count: true }),
  ]);
  const orderById = new Map(orderCounts.map((r) => [r.productId, r._count]));
  const saveById = new Map(saveCounts.map((r) => [r.productId, r._count]));

  const results = new Map<string, ProductQualityResult>();
  for (const product of products) {
    const orderCount = orderById.get(product.id) ?? 0;
    const saveCount = saveById.get(product.id) ?? 0;

    const breakdown: ProductQualityBreakdown = {
      images: (Math.min(product.images.length, 6) / 6) * 20,
      description: scoreDescription(product.description),
      title: scoreTitle(product.title),
      price: Number(product.price) > 0 ? 10 : 0,
      category: product.subcategoryId ? 10 : product.categoryId ? 6 : 0,
      engagement: 0,
      conversion: 0,
    };

    const hasEnoughEngagementData = product.viewCount >= MIN_EVENTS_FOR_ENGAGEMENT_SCORING;
    if (hasEnoughEngagementData) {
      breakdown.engagement = Math.min(Math.log10(product.viewCount + saveCount + 1) * 8, 15);
      breakdown.conversion = Math.min((orderCount / product.viewCount) * 400, 20);
    } else {
      breakdown.engagement = 7.5;
      breakdown.conversion = 10;
    }

    const score = Math.min(Math.round(Object.values(breakdown).reduce((sum, v) => sum + v, 0)), 100);
    const suggestions: string[] = [];
    if (breakdown.images < 14) suggestions.push("Add more photos.");
    if (breakdown.description < 10) suggestions.push("Write a fuller description.");
    if (breakdown.title < 7) suggestions.push("Use a clearer title.");
    if (breakdown.category < 10) suggestions.push("Pick a specific subcategory.");

    results.set(product.id, { score, breakdown, suggestions, hasEnoughEngagementData });
  }

  return results;
}

export interface ProductPerformanceInsight {
  message: string;
  severity: "info" | "opportunity" | "warning";
}

/**
 * Rule-based behavioral insights from real ProductEvent/OrderItem ratios —
 * thresholds are fixed, sensible defaults (documented inline), never
 * per-product hardcoded text. Only fires when there's enough traffic to
 * draw a real conclusion.
 */
export async function getProductPerformanceInsights(productId: string): Promise<ProductPerformanceInsight[]> {
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  const [orderCount, saveCount, impressionCount] = await Promise.all([
    db.orderItem.count({ where: { productId, order: { status: { notIn: ["CANCELLED", "REFUNDED"] } } } }),
    db.productEvent.count({ where: { productId, type: "SAVE" } }),
    db.productEvent.count({ where: { productId, type: "IMPRESSION" } }),
  ]);

  const insights: ProductPerformanceInsight[] = [];
  const ageDays = Math.max(1, (Date.now() - product.createdAt.getTime()) / 86_400_000);

  if (product.viewCount >= 20 && orderCount === 0) {
    insights.push({
      message: `${product.viewCount} people have viewed this, but nobody's purchased yet — customers are looking but not buying.`,
      severity: "warning",
    });
  }

  if (product.viewCount >= 10 && saveCount / product.viewCount >= 0.15 && orderCount === 0) {
    insights.push({
      message: `${saveCount} buyers saved this without purchasing — they like it but something's holding them back (price, or missing details).`,
      severity: "opportunity",
    });
  }

  if (product.status === "ACTIVE" && ageDays >= 7 && impressionCount < 5) {
    insights.push({
      message: "This listing rarely shows up in search results — a clearer title, brand, and category can improve discovery.",
      severity: "warning",
    });
  }

  if (product.viewCount > 0 && orderCount > 0 && orderCount / product.viewCount >= 0.1) {
    insights.push({ message: "This listing converts well — buyers who view it tend to purchase.", severity: "info" });
  }

  return insights;
}

export interface CompetitiveInsight {
  priceRange: { low: number; high: number } | null;
  averageImageCount: number;
  sampleSize: number;
}

/** Category-level aggregates only — never a specific competitor's price or listing. */
export async function getCompetitiveInsights(categoryId: string, excludeProductId?: string): Promise<CompetitiveInsight> {
  const [priceRange, products] = await Promise.all([
    getSuggestedPriceRange(categoryId),
    db.product.findMany({
      where: { categoryId, status: "ACTIVE", ...(excludeProductId && { id: { not: excludeProductId } }) },
      include: { images: { select: { id: true } } },
    }),
  ]);

  const sampleSize = products.length;
  const averageImageCount = sampleSize > 0 ? products.reduce((sum, p) => sum + p.images.length, 0) / sampleSize : 0;

  return { priceRange, averageImageCount: Math.round(averageImageCount * 10) / 10, sampleSize };
}

export interface BoostRecommendation {
  productId: string;
  title: string;
  reason: string;
}

/**
 * Only recommends a product that's earned it: it's ACTIVE, not already
 * boosted, and shows a real signal (a completed sale, or a high save rate)
 * alongside comparatively low visibility. Never a random/blanket suggestion.
 */
export async function getBoostRecommendationsForSeller(sellerId: string, limit = 5): Promise<BoostRecommendation[]> {
  const products = await db.product.findMany({ where: { sellerId, status: "ACTIVE" } });
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);
  const [boostedIds, orderCounts, saveCounts, impressionCounts] = await Promise.all([
    getActiveBoostProductIds(productIds),
    // Excludes cancelled/refunded orders — a refunded sale isn't a real "this converts" signal.
    db.orderItem.groupBy({ by: ["productId"], where: { productId: { in: productIds }, order: { status: { notIn: ["CANCELLED", "REFUNDED"] } } }, _count: true }),
    db.productEvent.groupBy({ by: ["productId"], where: { productId: { in: productIds }, type: "SAVE" }, _count: true }),
    db.productEvent.groupBy({ by: ["productId"], where: { productId: { in: productIds }, type: "IMPRESSION" }, _count: true }),
  ]);
  const orderById = new Map(orderCounts.map((r) => [r.productId, r._count]));
  const saveById = new Map(saveCounts.map((r) => [r.productId, r._count]));
  const impressionById = new Map(impressionCounts.map((r) => [r.productId, r._count]));

  const avgImpressions =
    products.reduce((sum, p) => sum + (impressionById.get(p.id) ?? 0), 0) / products.length || 1;

  const recommendations: BoostRecommendation[] = [];
  for (const product of products) {
    if (boostedIds.has(product.id)) continue;
    const orders = orderById.get(product.id) ?? 0;
    const saves = saveById.get(product.id) ?? 0;
    const impressions = impressionById.get(product.id) ?? 0;
    const saveRate = product.viewCount > 0 ? saves / product.viewCount : 0;
    const belowAverageVisibility = impressions < avgImpressions * 0.6;

    if (orders > 0 && belowAverageVisibility) {
      recommendations.push({
        productId: product.id,
        title: product.title,
        reason: "This product has already sold before but isn't getting much visibility right now — boosting may bring it back in front of buyers.",
      });
    } else if (saveRate >= 0.15 && product.viewCount >= 10 && belowAverageVisibility) {
      recommendations.push({
        productId: product.id,
        title: product.title,
        reason: "Buyers are saving this often but it has low visibility — a boost could turn those saves into sales.",
      });
    }
  }

  return recommendations.slice(0, limit);
}
