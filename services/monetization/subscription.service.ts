import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { getPrimaryIntegration, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { initializePaystackTransaction } from "@/services/payments/providers/paystack";
import { initializeFlutterwavePayment } from "@/services/payments/providers/flutterwave";
import { recordSubscriptionRevenue } from "@/services/finance/ledger.service";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
import { getDefaultPlan, getPlanById } from "@/services/monetization/subscription-plan.service";

/** Products in these statuses count against a plan's product cap — only "live or in the pipeline to go live" listings do. */
const LIVE_PRODUCT_STATUSES: ("ACTIVE" | "PENDING_REVIEW" | "PAUSED")[] = ["ACTIVE", "PENDING_REVIEW", "PAUSED"];

export interface EffectiveLimits {
  planId: string | null;
  planName: string;
  isPaidPlan: boolean;
  maxProducts: number | null;
  boostCreditsRemaining: number;
  hasAnalyticsAccess: boolean;
  hasFeaturedStore: boolean;
  hasPrioritySupport: boolean;
  expiresAt: Date | null;
  subscriptionId: string | null;
}

const UNRESTRICTED_LIMITS: EffectiveLimits = {
  planId: null,
  planName: "No plan configured",
  isPaidPlan: false,
  maxProducts: null,
  boostCreditsRemaining: 0,
  hasAnalyticsAccess: false,
  hasFeaturedStore: false,
  hasPrioritySupport: false,
  expiresAt: null,
  subscriptionId: null,
};

/**
 * The seller's current plan and benefits, self-healing on read: an ACTIVE
 * subscription past its `expiresAt` is transitioned to EXPIRED right here
 * (idempotent — the next call just won't find it anymore) so enforcement is
 * always correct even if the sweep cron hasn't run yet. Falls back to the
 * Super Admin-configured default plan, or an unrestricted sentinel if no
 * default plan exists at all (first-run safety — never blocks publishing
 * because nobody has set up plans yet).
 */
export async function getEffectiveLimits(sellerId: string): Promise<EffectiveLimits> {
  const active = await db.sellerSubscription.findFirst({
    where: { sellerId, status: "ACTIVE" },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    if (active.expiresAt && active.expiresAt.getTime() < Date.now()) {
      await expireSubscription(active.id);
      // Fall through to the default-plan lookup below.
    } else {
      return {
        planId: active.plan.id,
        planName: active.plan.name,
        isPaidPlan: true,
        maxProducts: active.plan.maxProducts,
        boostCreditsRemaining: active.boostCreditsRemaining,
        hasAnalyticsAccess: active.plan.hasAnalyticsAccess,
        hasFeaturedStore: active.plan.hasFeaturedStore,
        hasPrioritySupport: active.plan.hasPrioritySupport,
        expiresAt: active.expiresAt,
        subscriptionId: active.id,
      };
    }
  }

  const defaultPlan = await getDefaultPlan();
  if (!defaultPlan) return UNRESTRICTED_LIMITS;

  return {
    planId: defaultPlan.id,
    planName: defaultPlan.name,
    isPaidPlan: false,
    maxProducts: defaultPlan.maxProducts,
    boostCreditsRemaining: 0,
    hasAnalyticsAccess: defaultPlan.hasAnalyticsAccess,
    hasFeaturedStore: defaultPlan.hasFeaturedStore,
    hasPrioritySupport: defaultPlan.hasPrioritySupport,
    expiresAt: null,
    subscriptionId: null,
  };
}

export function getLiveProductCount(sellerId: string) {
  return db.product.count({ where: { sellerId, status: { in: LIVE_PRODUCT_STATUSES } } });
}

/** Throws if publishing one more live listing would exceed the seller's plan cap. Never counts DRAFT/REMOVED listings, and never deletes anything. */
export async function assertCanPublishAnotherProduct(sellerId: string) {
  const limits = await getEffectiveLimits(sellerId);
  if (limits.maxProducts === null) return;

  const liveCount = await getLiveProductCount(sellerId);
  if (liveCount >= limits.maxProducts) {
    throw new ValidationError(
      `You've reached the ${limits.maxProducts}-product limit on the ${limits.planName} plan. Upgrade in Growth Center to publish more.`,
    );
  }
}

export function getCurrentSubscriptionHistory(sellerId: string) {
  return db.sellerSubscription.findMany({ where: { sellerId }, include: { plan: true }, orderBy: { createdAt: "desc" } });
}

async function expireSubscription(subscriptionId: string) {
  const claim = await db.sellerSubscription.updateMany({ where: { id: subscriptionId, status: "ACTIVE" }, data: { status: "EXPIRED" } });
  if (claim.count === 0) return;

  const subscription = await db.sellerSubscription.findUniqueOrThrow({ where: { id: subscriptionId }, include: { plan: true, seller: true } });
  await notify({
    event: "SUBSCRIPTION_EXPIRED",
    userId: subscription.seller.userId,
    title: "Your subscription has expired",
    message: `Your ${subscription.plan.name} subscription has expired. You've moved to the free plan.`,
    actionUrl: ROUTES.seller.growth,
    emailVariables: { planName: subscription.plan.name },
  });
}

/**
 * Kicks off a plan change. Free plans (monthlyPrice = 0) activate instantly
 * with no payment step. Paid plans create a PENDING subscription + a
 * MonetizationPayment and return a hosted checkout URL — mirroring
 * `checkout.service.ts`'s order-payment flow exactly, just against the
 * lightweight monetization payment record instead of the order-coupled one.
 * Never activates a paid plan before the provider confirms payment.
 */
export async function initiateSubscriptionCheckout(sellerId: string, planId: string) {
  const plan = await getPlanById(planId);
  if (!plan.isActive) throw new ValidationError("This plan is no longer available");

  if (Number(plan.monthlyPrice) === 0) {
    const subscription = await activateFreeSubscription(sellerId, plan.id);
    return { activatedImmediately: true as const, subscription };
  }

  const primary = await getPrimaryIntegration("PAYMENT");
  if (!primary) throw new ConflictError("No payment provider is configured yet — please try again shortly");

  const { payment } = await db.$transaction(async (tx) => {
    await tx.sellerSubscription.updateMany({ where: { sellerId, status: "PENDING" }, data: { status: "CANCELLED" } });
    const newSubscription = await tx.sellerSubscription.create({ data: { sellerId, planId: plan.id, status: "PENDING" } });
    const newPayment = await tx.monetizationPayment.create({
      data: { sellerId, purpose: "SUBSCRIPTION", subscriptionId: newSubscription.id, amount: plan.monthlyPrice, provider: primary.provider, status: "PENDING" },
    });
    return { subscription: newSubscription, payment: newPayment };
  });

  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, include: { user: true } });
  const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}${ROUTES.seller.growth}`;
  const secretKey = await getDecryptedSecret(primary.id, "SECRET_KEY");

  if (primary.provider === "paystack") {
    const { authorizationUrl } = await initializePaystackTransaction(
      { email: seller.user.email, amountNaira: Number(payment.amount), reference: payment.id, callbackUrl },
      secretKey,
    );
    return { activatedImmediately: false as const, checkoutUrl: authorizationUrl };
  }

  if (primary.provider === "flutterwave") {
    const { paymentLink } = await initializeFlutterwavePayment(
      { email: seller.user.email, name: seller.user.firstName, amountNaira: Number(payment.amount), txRef: payment.id, redirectUrl: callbackUrl },
      secretKey,
    );
    return { activatedImmediately: false as const, checkoutUrl: paymentLink };
  }

  throw new ConflictError(`Unsupported payment provider: ${primary.provider}`);
}

async function activateFreeSubscription(sellerId: string, planId: string) {
  const plan = await getPlanById(planId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 86_400_000);

  const subscription = await db.$transaction(async (tx) => {
    await tx.sellerSubscription.updateMany({ where: { sellerId, status: { in: ["ACTIVE", "PENDING"] } }, data: { status: "CANCELLED" } });
    return tx.sellerSubscription.create({
      data: { sellerId, planId, status: "ACTIVE", startedAt: now, expiresAt, boostCreditsRemaining: plan.boostCreditsPerCycle },
    });
  });

  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  await notify({
    event: "SUBSCRIPTION_STARTED",
    userId: seller.userId,
    title: `${plan.name} plan activated`,
    message: `Your ${plan.name} plan is now active.`,
    actionUrl: ROUTES.seller.growth,
    emailVariables: { planName: plan.name, expiresAt: expiresAt.toLocaleDateString("en-NG") },
  });

  return subscription;
}

/**
 * The single entry point for a provider confirming a subscription charge
 * succeeded — idempotent, same atomic-claim pattern as
 * `payment.service.ts#confirmPaymentSuccess`, so a retried webhook delivery
 * never double-activates or double-records revenue.
 */
export async function confirmSubscriptionPayment(monetizationPaymentId: string, providerReference: string) {
  const payment = await db.monetizationPayment.findUnique({ where: { id: monetizationPaymentId } });
  if (!payment || payment.purpose !== "SUBSCRIPTION") throw new NotFoundError("Subscription payment");

  if (payment.status === "SUCCESS") return { payment, alreadyProcessed: true as const };
  if (payment.status !== "PENDING") throw new ValidationError(`Cannot confirm a payment in status ${payment.status}`);
  if (!payment.subscriptionId) throw new ValidationError("Payment has no associated subscription");

  const outcome = await db.$transaction(async (tx) => {
    const claim = await tx.monetizationPayment.updateMany({
      where: { id: monetizationPaymentId, status: "PENDING" },
      data: { status: "SUCCESS", providerReference },
    });
    if (claim.count === 0) return null;

    const subscription = await tx.sellerSubscription.findUniqueOrThrow({ where: { id: payment.subscriptionId! }, include: { plan: true } });

    await recordSubscriptionRevenue(tx, {
      amount: Number(payment.amount),
      sellerId: subscription.sellerId,
      reference: providerReference,
      note: `${subscription.plan.name} subscription payment`,
      metadata: { planId: subscription.plan.id },
    });
    await tx.auditLog.create({
      data: { action: "SUBSCRIPTION_PAYMENT_CONFIRMED", entityType: "MonetizationPayment", entityId: payment.id, metadata: { providerReference } },
    });

    // Money received is recorded above unconditionally. But if this specific
    // subscription row was superseded by a newer checkout attempt in the
    // meantime (CANCELLED), don't resurrect it over whatever plan the seller
    // is actually on now — a duplicate/late payment confirmation shouldn't
    // silently downgrade or replace their current active plan.
    if (subscription.status === "CANCELLED") {
      return { activated: null, plan: subscription.plan };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + subscription.plan.durationDays * 86_400_000);

    await tx.sellerSubscription.updateMany({
      where: { sellerId: subscription.sellerId, status: "ACTIVE", id: { not: subscription.id } },
      data: { status: "CANCELLED" },
    });
    const activated = await tx.sellerSubscription.update({
      where: { id: subscription.id },
      data: { status: "ACTIVE", startedAt: now, expiresAt, boostCreditsRemaining: subscription.plan.boostCreditsPerCycle },
    });

    return { activated, plan: subscription.plan };
  });

  if (!outcome) {
    const current = await db.monetizationPayment.findUniqueOrThrow({ where: { id: monetizationPaymentId } });
    return { payment: current, alreadyProcessed: true as const };
  }

  if (outcome.activated) {
    const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: outcome.activated.sellerId } });
    await notify({
      event: "SUBSCRIPTION_STARTED",
      userId: seller.userId,
      title: `${outcome.plan.name} plan activated`,
      message: `Your ${outcome.plan.name} plan is now active until ${outcome.activated.expiresAt!.toLocaleDateString("en-NG")}.`,
      actionUrl: ROUTES.seller.growth,
      emailVariables: { planName: outcome.plan.name, expiresAt: outcome.activated.expiresAt!.toLocaleDateString("en-NG") },
    });
  }

  return { payment: { ...payment, status: "SUCCESS" as const }, alreadyProcessed: false as const };
}

export async function markSubscriptionPaymentFailed(monetizationPaymentId: string) {
  const outcome = await db.$transaction(async (tx) => {
    const claim = await tx.monetizationPayment.updateMany({ where: { id: monetizationPaymentId, status: "PENDING" }, data: { status: "FAILED" } });
    if (claim.count === 0) return null;

    const payment = await tx.monetizationPayment.findUniqueOrThrow({ where: { id: monetizationPaymentId } });
    if (payment.subscriptionId) {
      await tx.sellerSubscription.updateMany({ where: { id: payment.subscriptionId, status: "PENDING" }, data: { status: "CANCELLED" } });
    }
    return payment;
  });

  if (outcome) {
    await alertAdmins(
      "Subscription payment failed",
      `A subscription payment of ₦${Number(outcome.amount).toLocaleString("en-NG")} failed for seller ${outcome.sellerId}.`,
      { actionUrl: ROUTES.admin.revenue, metadata: { monetizationPaymentId: outcome.id } },
    );
  }

  return outcome;
}

/** Seller-initiated cancellation — takes effect immediately (reverts to the default plan right away, not at period end). */
export async function cancelSubscription(sellerId: string) {
  const active = await db.sellerSubscription.findFirst({ where: { sellerId, status: "ACTIVE" } });
  if (!active) throw new ValidationError("No active subscription to cancel");

  return db.sellerSubscription.update({ where: { id: active.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
}

/**
 * Daily sweep (see the cron route) — expires anything past its date, and
 * warns sellers whose subscription expires within the next 1-3 days. The
 * narrow 2-3 day window (rather than "expiresAt < now + 3 days") keeps this
 * idempotent across daily runs without needing a separate "already
 * notified" flag: each subscription passes through the window on exactly
 * one run.
 */
export async function runSubscriptionExpirySweep() {
  const now = new Date();

  const expired = await db.sellerSubscription.findMany({ where: { status: "ACTIVE", expiresAt: { lt: now } } });
  for (const subscription of expired) await expireSubscription(subscription.id);

  const windowStart = new Date(now.getTime() + 2 * 86_400_000);
  const windowEnd = new Date(now.getTime() + 3 * 86_400_000);
  const expiringSoon = await db.sellerSubscription.findMany({
    where: { status: "ACTIVE", expiresAt: { gte: windowStart, lt: windowEnd } },
    include: { plan: true, seller: true },
  });
  for (const subscription of expiringSoon) {
    await notify({
      event: "SUBSCRIPTION_EXPIRING",
      userId: subscription.seller.userId,
      title: "Your subscription expires soon",
      message: `Your ${subscription.plan.name} subscription expires on ${subscription.expiresAt!.toLocaleDateString("en-NG")}.`,
      actionUrl: ROUTES.seller.growth,
      emailVariables: { planName: subscription.plan.name, expiresAt: subscription.expiresAt!.toLocaleDateString("en-NG") },
    });
  }

  return { expiredCount: expired.length, expiringSoonCount: expiringSoon.length };
}
