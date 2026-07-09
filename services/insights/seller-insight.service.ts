import "server-only";
import { db } from "@/lib/db";
import { ROUTES } from "@/lib/constants/routes";
import { notify } from "@/services/notifications/notify.service";
import { getSellerAnalytics } from "@/services/analytics/analytics.service";
import { listCustomersForSeller } from "@/services/orders/order.service";
import { getProductQualityScoresForSeller, getBoostRecommendationsForSeller } from "@/services/insights/product-insight.service";
import { getViolationCount, getTrustPenalty } from "@/services/messaging/contact-safety.service";

/**
 * The seller-facing half of the intelligence foundation — reads entirely
 * from existing tracking (Transaction, ProductEvent, Review, Dispute,
 * Message, SellerProfile, and ProductInsightService above it). This is the
 * one place a future AI layer should read "how is this seller doing" from,
 * rather than composing raw queries itself.
 */

const LIVE_PRODUCT_STATUSES = ["ACTIVE", "PENDING_REVIEW", "PAUSED"] as const;

// ---------------------------------------------------------------------------
// Phase 2 — performance dashboard
// ---------------------------------------------------------------------------

export interface PerformanceOverview {
  revenue: number;
  revenueGrowthPct: number | null;
  orderCount: number;
  orderGrowthPct: number | null;
  conversionRate: number;
  averageOrderValue: number;
  returningCustomerRate: number;
  discovery: { impressions: number; directViews: number; saves: number; shares: number };
}

export async function getPerformanceOverview(sellerId: string, days = 30): Promise<PerformanceOverview> {
  const since = new Date(Date.now() - days * 86_400_000);
  const priorSince = new Date(Date.now() - days * 2 * 86_400_000);

  const [currentTx, priorTx, analytics, customers, discoveryEvents] = await Promise.all([
    db.transaction.findMany({
      where: { sellerId, createdAt: { gte: since }, status: { in: ["HELD_IN_ESCROW", "RELEASED"] } },
      select: { sellerAmount: true, orderId: true },
    }),
    db.transaction.findMany({
      where: { sellerId, createdAt: { gte: priorSince, lt: since }, status: { in: ["HELD_IN_ESCROW", "RELEASED"] } },
      select: { sellerAmount: true, orderId: true },
    }),
    getSellerAnalytics(sellerId),
    listCustomersForSeller(sellerId),
    db.productEvent.groupBy({
      by: ["type"],
      where: { product: { sellerId }, createdAt: { gte: since }, type: { in: ["IMPRESSION", "VIEW", "SAVE", "SHARE"] } },
      _count: true,
    }),
  ]);

  const currentRevenue = currentTx.reduce((sum, t) => sum + Number(t.sellerAmount), 0);
  const priorRevenue = priorTx.reduce((sum, t) => sum + Number(t.sellerAmount), 0);
  const currentOrders = new Set(currentTx.map((t) => t.orderId)).size;
  const priorOrders = new Set(priorTx.map((t) => t.orderId)).size;

  const discoveryByType = Object.fromEntries(discoveryEvents.map((e) => [e.type, e._count])) as Record<string, number>;

  return {
    revenue: currentRevenue,
    revenueGrowthPct: priorRevenue > 0 ? ((currentRevenue - priorRevenue) / priorRevenue) * 100 : null,
    orderCount: currentOrders,
    orderGrowthPct: priorOrders > 0 ? ((currentOrders - priorOrders) / priorOrders) * 100 : null,
    conversionRate: analytics.conversionRate,
    averageOrderValue: currentOrders > 0 ? currentRevenue / currentOrders : 0,
    returningCustomerRate: customers.length > 0 ? customers.filter((c) => c.orderCount > 1).length / customers.length : 0,
    discovery: {
      impressions: discoveryByType.IMPRESSION ?? 0,
      directViews: discoveryByType.VIEW ?? 0,
      saves: discoveryByType.SAVE ?? 0,
      shares: discoveryByType.SHARE ?? 0,
    },
  };
}

export interface ProductPerformanceRow {
  productId: string;
  title: string;
  status: string;
  viewCount: number;
  orderCount: number;
  revenue: number;
  qualityScore: number;
}

/** "What's selling" vs "what's failing" — ranked by real revenue/views, never a curated list. */
export async function getProductPerformanceBreakdown(sellerId: string, limit = 6) {
  const products = await db.product.findMany({ where: { sellerId, status: { not: "REMOVED" } } });
  if (products.length === 0) return { topPerformers: [] as ProductPerformanceRow[], underperformers: [] as ProductPerformanceRow[] };

  const productIds = products.map((p) => p.id);
  const [orderItems, qualityScores] = await Promise.all([
    db.orderItem.findMany({
      where: { productId: { in: productIds }, order: { status: { notIn: ["CANCELLED", "REFUNDED"] } } },
      select: { productId: true, unitPrice: true, quantity: true },
    }),
    getProductQualityScoresForSeller(sellerId),
  ]);

  const revenueByProduct = new Map<string, number>();
  const orderCountByProduct = new Map<string, number>();
  for (const item of orderItems) {
    revenueByProduct.set(item.productId, (revenueByProduct.get(item.productId) ?? 0) + Number(item.unitPrice) * item.quantity);
    orderCountByProduct.set(item.productId, (orderCountByProduct.get(item.productId) ?? 0) + 1);
  }

  const rows: ProductPerformanceRow[] = products.map((p) => ({
    productId: p.id,
    title: p.title,
    status: p.status,
    viewCount: p.viewCount,
    orderCount: orderCountByProduct.get(p.id) ?? 0,
    revenue: revenueByProduct.get(p.id) ?? 0,
    qualityScore: qualityScores.get(p.id)?.score ?? 0,
  }));

  const topPerformers = rows.filter((r) => r.orderCount > 0).sort((a, b) => b.revenue - a.revenue).slice(0, limit);
  const underperformers = rows
    .filter((r) => r.status === "ACTIVE" && r.orderCount === 0 && r.viewCount > 0)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);

  return { topPerformers, underperformers };
}

// ---------------------------------------------------------------------------
// Phase 3 — Store Health Score
// ---------------------------------------------------------------------------

export interface StoreHealthBreakdown {
  profileCompleteness: number;
  productQuality: number;
  productAvailability: number;
  responseSpeed: number;
  orderCompletionRate: number;
  reviewScore: number;
  disputeRate: number;
  customerSatisfaction: number;
}

export interface StoreHealthResult {
  overall: number;
  label: "Excellent" | "Good" | "Fair" | "Needs improvement";
  categories: { profile: number; products: number; customerExperience: number };
  breakdown: StoreHealthBreakdown;
  trustPenalty: number;
}

/** Weights sum to 100 — see schema.prisma's Monetization section for the sibling pattern (Super Admin-configurable pricing); these weights are fixed in code since they're a scoring rubric, not a business price. */
const HEALTH_WEIGHTS: Record<keyof StoreHealthBreakdown, number> = {
  profileCompleteness: 15,
  productQuality: 20,
  productAvailability: 10,
  responseSpeed: 10,
  orderCompletionRate: 15,
  reviewScore: 15,
  disputeRate: 10,
  customerSatisfaction: 5,
};

function scoreProfileCompleteness(profile: { bio: string | null; bannerUrl: string | null; categoryTags: string[]; verificationStatus: string; city: string | null; state: string | null }) {
  let score = 0;
  if (profile.bio && profile.bio.trim().length > 20) score += 20;
  if (profile.bannerUrl) score += 20;
  if (profile.categoryTags.length > 0) score += 20;
  if (profile.verificationStatus === "VERIFIED") score += 30;
  if (profile.city && profile.state) score += 10;
  return score;
}

/** Average hours between a buyer's message and the seller's next reply, mapped to a 0-100 score. No conversations yet -> neutral (not yet earned or lost). */
async function getResponseSpeedScore(sellerId: string): Promise<number> {
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, select: { userId: true } });
  const conversations = await db.conversation.findMany({
    where: { sellerProfileId: sellerId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
    orderBy: { lastMessageAt: "desc" },
    take: 20,
  });

  const responseTimesMs: number[] = [];
  for (const conversation of conversations) {
    for (let i = 0; i < conversation.messages.length - 1; i++) {
      const message = conversation.messages[i];
      const next = conversation.messages[i + 1];
      if (message.senderId !== seller.userId && next.senderId === seller.userId) {
        responseTimesMs.push(next.createdAt.getTime() - message.createdAt.getTime());
      }
    }
  }
  if (responseTimesMs.length === 0) return 70;

  const avgHours = responseTimesMs.reduce((sum, ms) => sum + ms, 0) / responseTimesMs.length / 3_600_000;
  if (avgHours <= 1) return 100;
  if (avgHours <= 6) return 85;
  if (avgHours <= 24) return 65;
  if (avgHours <= 72) return 40;
  return 20;
}

export async function getStoreHealthScore(sellerId: string): Promise<StoreHealthResult> {
  const profile = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });

  const [qualityScores, statusCounts, transactions, disputeCount, responseSpeed, reviews, violationCount] = await Promise.all([
    getProductQualityScoresForSeller(sellerId),
    db.product.groupBy({ by: ["status"], where: { sellerId }, _count: true }),
    db.transaction.findMany({ where: { sellerId }, select: { status: true } }),
    db.dispute.count({ where: { sellerId } }),
    getResponseSpeedScore(sellerId),
    db.review.findMany({ where: { product: { sellerId } }, select: { rating: true } }),
    getViolationCount(profile.userId),
  ]);

  const profileCompleteness = scoreProfileCompleteness(profile);

  const activeCount = statusCounts.find((s) => s.status === "ACTIVE")?._count ?? 0;
  const liveCount = statusCounts.filter((s) => (LIVE_PRODUCT_STATUSES as readonly string[]).includes(s.status)).reduce((sum, r) => sum + r._count, 0);
  const productAvailability = liveCount === 0 ? 50 : Math.min(100, (activeCount / liveCount) * 100);

  const qualityValues = Array.from(qualityScores.values()).map((q) => q.score);
  const productQuality = qualityValues.length > 0 ? qualityValues.reduce((sum, v) => sum + v, 0) / qualityValues.length : 70;

  const completedTx = transactions.filter((t) => t.status === "RELEASED").length;
  const refundedTx = transactions.filter((t) => t.status === "REFUNDED").length;
  const decidedTx = completedTx + refundedTx;
  const orderCompletionRate = decidedTx === 0 ? 70 : (completedTx / decidedTx) * 100;

  const reviewScore = profile.ratingCount === 0 ? 70 : (profile.ratingAverage / 5) * 100;

  const disputeRatio = transactions.length === 0 ? 0 : disputeCount / transactions.length;
  const disputeRate = transactions.length === 0 ? 85 : Math.max(0, 100 - disputeRatio * 500);

  const customerSatisfaction = reviews.length === 0 ? 70 : (reviews.filter((r) => r.rating >= 4).length / reviews.length) * 100;

  const breakdown: StoreHealthBreakdown = {
    profileCompleteness,
    productQuality,
    productAvailability,
    responseSpeed,
    orderCompletionRate,
    reviewScore,
    disputeRate,
    customerSatisfaction,
  };

  const weightedScore = Math.round(
    (Object.keys(breakdown) as (keyof StoreHealthBreakdown)[]).reduce((sum, key) => sum + breakdown[key] * (HEALTH_WEIGHTS[key] / 100), 0),
  );
  // A single flagged message costs nothing — only a genuine pattern of
  // repeated contact-sharing attempts (Phase 6) pulls the score down.
  const trustPenalty = getTrustPenalty(violationCount);
  const overall = Math.max(0, weightedScore - trustPenalty);

  const categories = {
    profile: Math.round(profileCompleteness),
    products: Math.round((productQuality * 20 + productAvailability * 10) / 30),
    customerExperience: Math.max(
      0,
      Math.round((responseSpeed * 10 + orderCompletionRate * 15 + reviewScore * 15 + disputeRate * 10 + customerSatisfaction * 5) / 55 - trustPenalty),
    ),
  };

  const label: StoreHealthResult["label"] = overall >= 85 ? "Excellent" : overall >= 70 ? "Good" : overall >= 50 ? "Fair" : "Needs improvement";

  return { overall, label, categories, breakdown, trustPenalty };
}

// ---------------------------------------------------------------------------
// Phase 14 — Messaging analytics
// ---------------------------------------------------------------------------

export interface MessagingAnalytics {
  totalConversations: number;
  averageReplyTimeHours: number | null;
  responseRate: number;
  messageToPurchaseRate: number;
  offerAcceptanceRate: number | null;
}

export async function getMessagingAnalytics(sellerId: string): Promise<MessagingAnalytics> {
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, select: { userId: true } });
  const conversations = await db.conversation.findMany({
    where: { sellerProfileId: sellerId },
    include: { messages: { orderBy: { createdAt: "asc" }, select: { senderId: true, createdAt: true } } },
  });

  let repliedCount = 0;
  const replyTimesMs: number[] = [];
  for (const conversation of conversations) {
    if (conversation.messages.some((m) => m.senderId === seller.userId)) repliedCount += 1;
    for (let i = 0; i < conversation.messages.length - 1; i++) {
      const message = conversation.messages[i];
      const next = conversation.messages[i + 1];
      if (message.senderId !== seller.userId && next.senderId === seller.userId) {
        replyTimesMs.push(next.createdAt.getTime() - message.createdAt.getTime());
      }
    }
  }

  const responseRate = conversations.length > 0 ? repliedCount / conversations.length : 0;
  const averageReplyTimeHours = replyTimesMs.length > 0 ? replyTimesMs.reduce((sum, ms) => sum + ms, 0) / replyTimesMs.length / 3_600_000 : null;

  const buyerIds = Array.from(new Set(conversations.map((c) => c.buyerId)));
  const purchasingBuyers =
    buyerIds.length > 0
      ? await db.order.findMany({ where: { buyerId: { in: buyerIds }, items: { some: { product: { sellerId } } } }, select: { buyerId: true }, distinct: ["buyerId"] })
      : [];
  const messageToPurchaseRate = buyerIds.length > 0 ? purchasingBuyers.length / buyerIds.length : 0;

  const offers = await db.offer.findMany({ where: { sellerId }, select: { status: true } });
  const decidedOffers = offers.filter((o) => o.status === "ACCEPTED" || o.status === "REJECTED");
  const offerAcceptanceRate = decidedOffers.length > 0 ? decidedOffers.filter((o) => o.status === "ACCEPTED").length / decidedOffers.length : null;

  return {
    totalConversations: conversations.length,
    averageReplyTimeHours,
    responseRate,
    messageToPurchaseRate,
    offerAcceptanceRate,
  };
}

// ---------------------------------------------------------------------------
// Phase 7 — Inventory intelligence
// ---------------------------------------------------------------------------

export interface InventoryIntelligence {
  fastMovers: { productId: string; title: string; daysToSell: number }[];
  slowMovers: { productId: string; title: string; daysListed: number; viewCount: number }[];
  recentlySold: { productId: string; title: string; soldAt: Date }[];
  restockSuggestions: { label: string; count: number }[];
}

/**
 * This is a single-item resale marketplace (no quantity-based restocking),
 * so "restock" here means the real equivalent: which brands have sold
 * repeatedly for this seller — list more like those, not the same item.
 * "daysToSell" is derived from `updatedAt - createdAt` on a SOLD product;
 * nothing else moves a SOLD row's updatedAt (see moderateProduct/
 * pauseProduct/resumeProduct, all guarded on non-SOLD statuses), so this is
 * a reliable proxy for "when it sold" without a dedicated column.
 */
export async function getInventoryIntelligence(sellerId: string): Promise<InventoryIntelligence> {
  const [soldProducts, activeProducts] = await Promise.all([
    db.product.findMany({ where: { sellerId, status: "SOLD" }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.product.findMany({ where: { sellerId, status: "ACTIVE" } }),
  ]);

  const fastMovers = soldProducts
    .map((p) => ({ productId: p.id, title: p.title, daysToSell: Math.max(0, Math.round((p.updatedAt.getTime() - p.createdAt.getTime()) / 86_400_000)) }))
    .sort((a, b) => a.daysToSell - b.daysToSell)
    .slice(0, 5);

  const slowMovers = activeProducts
    .map((p) => ({ productId: p.id, title: p.title, daysListed: Math.round((Date.now() - p.createdAt.getTime()) / 86_400_000), viewCount: p.viewCount }))
    .filter((p) => p.daysListed >= 21 && p.viewCount < 10)
    .sort((a, b) => b.daysListed - a.daysListed)
    .slice(0, 5);

  const recentlySold = soldProducts.slice(0, 5).map((p) => ({ productId: p.id, title: p.title, soldAt: p.updatedAt }));

  const brandCounts = new Map<string, number>();
  for (const product of soldProducts) {
    if (product.brand) brandCounts.set(product.brand, (brandCounts.get(product.brand) ?? 0) + 1);
  }
  const restockSuggestions = Array.from(brandCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  return { fastMovers, slowMovers, recentlySold, restockSuggestions };
}

// ---------------------------------------------------------------------------
// Phase 8 — Customer insights (aggregate only — never individual buyer identity)
// ---------------------------------------------------------------------------

export interface CustomerInsights {
  totalCustomers: number;
  returningCustomers: number;
  returningRate: number;
  topLocations: { location: string; count: number }[];
  buyingHourHistogram: { hour: number; count: number }[];
  topCategoriesPurchased: { categoryName: string; count: number }[];
}

export async function getCustomerInsights(sellerId: string): Promise<CustomerInsights> {
  const [customers, orders] = await Promise.all([
    listCustomersForSeller(sellerId),
    db.order.findMany({
      where: { items: { some: { product: { sellerId } } } },
      select: {
        createdAt: true,
        shippingAddress: true,
        items: { where: { product: { sellerId } }, include: { product: { include: { category: true } } } },
      },
    }),
  ]);

  const locationCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const categoryCounts = new Map<string, number>();

  for (const order of orders) {
    const address = order.shippingAddress as { city?: string; state?: string } | null;
    const location = address?.city && address?.state ? `${address.city}, ${address.state}` : null;
    if (location) locationCounts.set(location, (locationCounts.get(location) ?? 0) + 1);

    const hour = order.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    for (const item of order.items) {
      const name = item.product.category.name;
      categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
    }
  }

  const totalCustomers = customers.length;
  const returningCustomers = customers.filter((c) => c.orderCount > 1).length;

  return {
    totalCustomers,
    returningCustomers,
    returningRate: totalCustomers > 0 ? returningCustomers / totalCustomers : 0,
    topLocations: Array.from(locationCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([location, count]) => ({ location, count })),
    buyingHourHistogram: Array.from(hourCounts.entries()).sort((a, b) => a[0] - b[0]).map(([hour, count]) => ({ hour, count })),
    topCategoriesPurchased: Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([categoryName, count]) => ({ categoryName, count })),
  };
}

// ---------------------------------------------------------------------------
// Phase 6 — Seller action recommendations
// ---------------------------------------------------------------------------

export interface SellerRecommendation {
  title: string;
  reason: string;
  impact: "high" | "medium" | "low";
  actionUrl: string;
}

/** Ties Store Health gaps, inventory intelligence, and boost recommendations into a concrete to-do list — every item is backed by a real gap, never a generic filler task. */
export async function getSellerRecommendations(sellerId: string): Promise<SellerRecommendation[]> {
  const [profile, health, inventory, qualityScores, boostRecs] = await Promise.all([
    db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } }),
    getStoreHealthScore(sellerId),
    getInventoryIntelligence(sellerId),
    getProductQualityScoresForSeller(sellerId),
    getBoostRecommendationsForSeller(sellerId, 2),
  ]);

  const recommendations: SellerRecommendation[] = [];

  if (!profile.onboardingCompletedAt) {
    recommendations.push({
      title: "Finish onboarding",
      reason: "Complete onboarding to unlock full seller features.",
      impact: "high",
      actionUrl: ROUTES.seller.onboarding.store,
    });
  }

  if (health.breakdown.profileCompleteness < 70) {
    recommendations.push({
      title: "Complete your store profile",
      reason: "A complete profile (bio, banner, categories) builds buyer trust and improves your Store Health score.",
      impact: "medium",
      actionUrl: ROUTES.seller.settings,
    });
  }

  const lowQualityCount = Array.from(qualityScores.values()).filter((q) => q.score < 50).length;
  if (lowQualityCount > 0) {
    recommendations.push({
      title: `Improve ${lowQualityCount} listing${lowQualityCount > 1 ? "s" : ""}`,
      reason: "Some of your active listings are missing photos or details that help them convert.",
      impact: "high",
      actionUrl: ROUTES.seller.products,
    });
  }

  if (health.breakdown.responseSpeed < 65) {
    recommendations.push({
      title: "Reply to customers faster",
      reason: "Faster responses improve buyer trust and your Store Health score.",
      impact: "medium",
      actionUrl: ROUTES.seller.messages,
    });
  }

  if (inventory.restockSuggestions.length > 0) {
    const top = inventory.restockSuggestions[0];
    recommendations.push({
      title: `List more ${top.label} items`,
      reason: `${top.label} has sold ${top.count} times for you — buyers want more.`,
      impact: "medium",
      actionUrl: ROUTES.seller.newProduct,
    });
  }

  for (const rec of boostRecs) {
    recommendations.push({
      title: `Promote "${rec.title}"`,
      reason: rec.reason,
      impact: "high",
      actionUrl: ROUTES.seller.marketing,
    });
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Phase 11 — Seller reports
// ---------------------------------------------------------------------------

export interface SellerReport {
  period: "weekly" | "monthly";
  revenue: number;
  revenueGrowthPct: number | null;
  orderCount: number;
  topProducts: { title: string; revenue: number }[];
  improvementAreas: string[];
}

export async function generateSellerReport(sellerId: string, period: "weekly" | "monthly"): Promise<SellerReport> {
  const days = period === "weekly" ? 7 : 30;
  const [overview, breakdown, health] = await Promise.all([
    getPerformanceOverview(sellerId, days),
    getProductPerformanceBreakdown(sellerId, 3),
    getStoreHealthScore(sellerId),
  ]);

  const improvementAreas: string[] = [];
  if (health.breakdown.productQuality < 70) improvementAreas.push("listing quality");
  if (health.breakdown.responseSpeed < 65) improvementAreas.push("response time");
  if (overview.returningCustomerRate < 0.2) improvementAreas.push("repeat customers");

  return {
    period,
    revenue: overview.revenue,
    revenueGrowthPct: overview.revenueGrowthPct,
    orderCount: overview.orderCount,
    topProducts: breakdown.topPerformers.map((p) => ({ title: p.title, revenue: p.revenue })),
    improvementAreas,
  };
}

/** Skips sending if there's nothing to report — a brand-new seller doesn't need a weekly "you made ₦0" ping. */
export async function sendSellerReportNotification(sellerId: string, period: "weekly" | "monthly") {
  const report = await generateSellerReport(sellerId, period);
  if (report.orderCount === 0 && report.revenue === 0) return;

  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  const format = (value: number) => `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
  const growthText =
    report.revenueGrowthPct !== null
      ? ` (${report.revenueGrowthPct >= 0 ? "+" : ""}${report.revenueGrowthPct.toFixed(0)}% vs last ${period === "weekly" ? "week" : "month"})`
      : "";
  const topProductText = report.topProducts[0] ? ` Top seller: "${report.topProducts[0].title}".` : "";

  await notify({
    event: period === "weekly" ? "SELLER_WEEKLY_REPORT" : "SELLER_MONTHLY_REPORT",
    userId: seller.userId,
    title: `Your ${period} report`,
    message: `${format(report.revenue)} in revenue${growthText} from ${report.orderCount} order${report.orderCount === 1 ? "" : "s"}.${topProductText}`,
    actionUrl: ROUTES.seller.analytics,
  });
}

export async function runWeeklySellerReports() {
  const sellers = await db.sellerProfile.findMany({ where: { onboardingCompletedAt: { not: null } }, select: { id: true } });
  for (const seller of sellers) await sendSellerReportNotification(seller.id, "weekly").catch(() => {});
  return { sellerCount: sellers.length };
}

export async function runMonthlySellerReports() {
  const sellers = await db.sellerProfile.findMany({ where: { onboardingCompletedAt: { not: null } }, select: { id: true } });
  for (const seller of sellers) await sendSellerReportNotification(seller.id, "monthly").catch(() => {});
  return { sellerCount: sellers.length };
}
