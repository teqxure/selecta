import "server-only";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { getEffectiveLimits, type EffectiveLimits } from "@/services/monetization/subscription.service";
import { ROUTES } from "@/lib/constants/routes";

/**
 * The single place every premium feature checks a plan — never
 * `if (plan === "PRO")` scattered across files. Five "core" keys read
 * straight off the structured columns `getEffectiveLimits` already
 * resolves (self-healing expiry, default-plan fallback, all handled
 * there — not duplicated here); anything else (AI features first, more
 * later) is a row in `PlanFeature`, editable per plan from /admin/plans
 * with no code deploy.
 */
export type FeatureKey =
  | "PRODUCT_LISTING"
  | "BOOST_CREDITS"
  | "ANALYTICS_ACCESS"
  | "FEATURED_STORE"
  | "PRIORITY_SUPPORT"
  | "AI_PRODUCT_WRITER";

export interface AccessResult {
  allowed: boolean;
  reason?: string;
  limits: EffectiveLimits;
}

const CORE_KEYS = new Set<FeatureKey>(["PRODUCT_LISTING", "BOOST_CREDITS", "ANALYTICS_ACCESS", "FEATURED_STORE", "PRIORITY_SUPPORT"]);

function coreAccess(limits: EffectiveLimits, feature: FeatureKey): boolean {
  switch (feature) {
    case "PRODUCT_LISTING":
      return true; // gated by count vs maxProducts elsewhere (assertCanPublishAnotherProduct), not a yes/no flag
    case "BOOST_CREDITS":
      return limits.boostCreditsRemaining > 0;
    case "ANALYTICS_ACCESS":
      return limits.hasAnalyticsAccess;
    case "FEATURED_STORE":
      return limits.hasFeaturedStore;
    case "PRIORITY_SUPPORT":
      return limits.hasPrioritySupport;
    default:
      return false;
  }
}

export async function canAccess(sellerId: string, feature: FeatureKey): Promise<AccessResult> {
  const limits = await getEffectiveLimits(sellerId);

  // No plan configured at all yet (first-run safety, same sentinel
  // getEffectiveLimits itself returns) — never block before a Super Admin
  // has set up plans.
  if (!limits.planId) return { allowed: true, limits };

  if (CORE_KEYS.has(feature)) {
    const allowed = coreAccess(limits, feature);
    return allowed ? { allowed, limits } : { allowed, limits, reason: upgradeReason(feature, limits) };
  }

  const planFeature = await db.planFeature.findUnique({ where: { planId_featureKey: { planId: limits.planId, featureKey: feature } } });
  const allowed = planFeature?.enabled ?? false;
  return allowed ? { allowed, limits } : { allowed, limits, reason: upgradeReason(feature, limits) };
}

function upgradeReason(feature: FeatureKey, limits: EffectiveLimits): string {
  const labels: Record<FeatureKey, string> = {
    PRODUCT_LISTING: "listing more products",
    BOOST_CREDITS: "boosting a product",
    ANALYTICS_ACCESS: "analytics",
    FEATURED_STORE: "featured store placement",
    PRIORITY_SUPPORT: "priority support",
    AI_PRODUCT_WRITER: "the AI Product Writer",
  };
  return `${labels[feature]} isn't included in the ${limits.planName} plan. Upgrade in Growth Center to unlock it.`;
}

/** Throws a ForbiddenError with an upgrade-worthy message when access is denied — the guard every gated Server Action/page should call first. */
export async function requireAccess(sellerId: string, feature: FeatureKey): Promise<EffectiveLimits> {
  const result = await canAccess(sellerId, feature);
  if (!result.allowed) throw new ForbiddenError(result.reason ?? `This feature isn't included in your current plan. Upgrade in Growth Center to unlock it.`);
  return result.limits;
}

function currentCycleStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/** Plan-enabled AND under the monthly cap (if one is set) for the current calendar-month cycle. */
export async function canUseAiFeature(sellerId: string, feature: FeatureKey): Promise<AccessResult & { remaining: number | null }> {
  const access = await canAccess(sellerId, feature);
  if (!access.allowed) return { ...access, remaining: 0 };

  const limits = access.limits;
  const planFeature = limits.planId
    ? await db.planFeature.findUnique({ where: { planId_featureKey: { planId: limits.planId, featureKey: feature } } })
    : null;
  const monthlyLimit = planFeature?.monthlyLimit ?? null;
  if (monthlyLimit === null) return { ...access, remaining: null };

  const usage = await db.aiFeatureUsage.findUnique({
    where: { sellerId_featureKey_cycleStart: { sellerId, featureKey: feature, cycleStart: currentCycleStart() } },
  });
  const used = usage?.count ?? 0;
  const remaining = Math.max(0, monthlyLimit - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      limits,
      remaining: 0,
      reason: `You've used all ${monthlyLimit} AI actions included in the ${limits.planName} plan this month. Upgrade in Growth Center for more, or wait for next month's reset.`,
    };
  }

  return { allowed: true, limits, remaining };
}

export async function requireAiFeatureUsage(sellerId: string, feature: FeatureKey): Promise<EffectiveLimits> {
  const result = await canUseAiFeature(sellerId, feature);
  if (!result.allowed) throw new ForbiddenError(result.reason ?? "You've reached your AI usage limit for this month.");
  return result.limits;
}

/** Only call after a successful generation — a failed AI call must never consume a seller's usage slot. */
export async function recordAiUsage(sellerId: string, feature: FeatureKey): Promise<void> {
  const cycleStart = currentCycleStart();
  await db.aiFeatureUsage.upsert({
    where: { sellerId_featureKey_cycleStart: { sellerId, featureKey: feature, cycleStart } },
    create: { sellerId, featureKey: feature, cycleStart, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/** Referenced by upgrade prompts across the app — kept here so the entitlement service is the one place that knows where "go upgrade" leads. */
export const UPGRADE_URL = ROUTES.seller.growth;

/**
 * Real search-ranking wiring for `hasFeaturedStore` — a batch lookup (same
 * "precompute a Set up front" shape as `getActiveBoostProductIds`) so
 * scoring a page of search results never does one query per seller.
 */
export async function getFeaturedStoreSellerIds(sellerIds: string[]): Promise<Set<string>> {
  if (sellerIds.length === 0) return new Set();
  const rows = await db.sellerSubscription.findMany({
    where: { sellerId: { in: sellerIds }, status: "ACTIVE", plan: { hasFeaturedStore: true } },
    select: { sellerId: true },
  });
  return new Set(rows.map((r) => r.sellerId));
}
