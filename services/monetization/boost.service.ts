import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { getPrimaryIntegration, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { initializePaystackTransaction } from "@/services/payments/providers/paystack";
import { initializeFlutterwavePayment } from "@/services/payments/providers/flutterwave";
import { recordBoostRevenue } from "@/services/finance/ledger.service";
import { notify } from "@/services/notifications/notify.service";
import { getSystemSettings } from "@/services/platform/system-settings.service";
import { getEffectiveLimits } from "@/services/monetization/subscription.service";
import type { BoostGoal } from "@/generated/prisma/enums";

/** Unit conversion, not a price — 1 boost credit always buys exactly 1 day of visibility, regardless of the admin-configurable cash price per day. */
const CREDIT_DAYS_RATIO = 1;

async function getOwnedActiveProduct(sellerId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, sellerId, status: "ACTIVE" } });
  if (!product) throw new NotFoundError("Active product");
  return product;
}

export interface CreateBoostCampaignInput {
  productId: string;
  goal: BoostGoal;
  durationDays: number;
}

/**
 * Pays with subscription boost credits first (instant activation, no
 * payment step); falls back to a cash Paystack/Flutterwave charge — same
 * hosted-checkout pattern as order and subscription payments — only if the
 * seller doesn't have enough credits. A boost never activates before either
 * a credit deduction or a confirmed payment.
 */
export async function createBoostCampaign(sellerId: string, input: CreateBoostCampaignInput) {
  if (input.durationDays < 1 || input.durationDays > 30) throw new ValidationError("Boost duration must be between 1 and 30 days");

  const product = await getOwnedActiveProduct(sellerId, input.productId);

  const existing = await db.boostCampaign.findFirst({
    where: { productId: product.id, status: { in: ["PENDING_PAYMENT", "ACTIVE"] } },
  });
  if (existing) throw new ConflictError("This product already has a running or pending boost campaign");

  const creditsCost = Math.ceil(input.durationDays / CREDIT_DAYS_RATIO);
  const limits = await getEffectiveLimits(sellerId);

  if (limits.subscriptionId && limits.boostCreditsRemaining >= creditsCost) {
    const now = new Date();
    const endDate = new Date(now.getTime() + input.durationDays * 86_400_000);

    const campaign = await db.$transaction(async (tx) => {
      const claim = await tx.sellerSubscription.updateMany({
        where: { id: limits.subscriptionId!, boostCreditsRemaining: { gte: creditsCost } },
        data: { boostCreditsRemaining: { decrement: creditsCost } },
      });
      if (claim.count === 0) throw new ConflictError("Boost credits changed — please try again");

      return tx.boostCampaign.create({
        data: { sellerId, productId: product.id, goal: input.goal, durationDays: input.durationDays, creditsCost, status: "ACTIVE", startDate: now, endDate },
      });
    });

    await sendBoostStartedNotification(campaign.id);
    return { activatedImmediately: true as const, campaign };
  }

  const primary = await getPrimaryIntegration("PAYMENT");
  if (!primary) throw new ConflictError("No payment provider is configured yet — please try again shortly");

  const settings = await getSystemSettings();
  const amount = Number(settings.boostPricePerDay) * input.durationDays;

  const { payment } = await db.$transaction(async (tx) => {
    const newCampaign = await tx.boostCampaign.create({
      data: { sellerId, productId: product.id, goal: input.goal, durationDays: input.durationDays, creditsCost, status: "PENDING_PAYMENT" },
    });
    const newPayment = await tx.monetizationPayment.create({
      data: { sellerId, purpose: "BOOST", boostCampaignId: newCampaign.id, amount, provider: primary.provider, status: "PENDING" },
    });
    return { campaign: newCampaign, payment: newPayment };
  });

  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId }, include: { user: true } });
  const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}${ROUTES.seller.marketing}`;
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

async function sendBoostStartedNotification(campaignId: string) {
  const campaign = await db.boostCampaign.findUniqueOrThrow({ where: { id: campaignId }, include: { product: true, seller: true } });
  await notify({
    event: "BOOST_STARTED",
    userId: campaign.seller.userId,
    title: "Boost campaign started",
    message: `Your boost campaign for "${campaign.product.title}" is now live for ${campaign.durationDays} days.`,
    actionUrl: ROUTES.seller.marketing,
    emailVariables: { productTitle: campaign.product.title, endDate: campaign.endDate!.toLocaleDateString("en-NG") },
  });
}

/** Idempotent — same atomic-claim pattern as order/subscription payment confirmation. */
export async function confirmBoostPayment(monetizationPaymentId: string, providerReference: string) {
  const payment = await db.monetizationPayment.findUnique({ where: { id: monetizationPaymentId } });
  if (!payment || payment.purpose !== "BOOST") throw new NotFoundError("Boost payment");

  if (payment.status === "SUCCESS") return { payment, alreadyProcessed: true as const };
  if (payment.status !== "PENDING") throw new ValidationError(`Cannot confirm a payment in status ${payment.status}`);
  if (!payment.boostCampaignId) throw new ValidationError("Payment has no associated boost campaign");

  const outcome = await db.$transaction(async (tx) => {
    const claim = await tx.monetizationPayment.updateMany({
      where: { id: monetizationPaymentId, status: "PENDING" },
      data: { status: "SUCCESS", providerReference },
    });
    if (claim.count === 0) return null;

    const campaign = await tx.boostCampaign.findUniqueOrThrow({ where: { id: payment.boostCampaignId! } });
    const now = new Date();
    const endDate = new Date(now.getTime() + campaign.durationDays * 86_400_000);
    const activated = await tx.boostCampaign.update({ where: { id: campaign.id }, data: { status: "ACTIVE", startDate: now, endDate } });

    await recordBoostRevenue(tx, {
      amount: Number(payment.amount),
      sellerId: campaign.sellerId,
      reference: providerReference,
      note: "Product boost campaign payment",
      metadata: { boostCampaignId: campaign.id, productId: campaign.productId },
    });

    await tx.auditLog.create({
      data: { action: "BOOST_PAYMENT_CONFIRMED", entityType: "MonetizationPayment", entityId: payment.id, metadata: { providerReference } },
    });

    return activated;
  });

  if (!outcome) {
    const current = await db.monetizationPayment.findUniqueOrThrow({ where: { id: monetizationPaymentId } });
    return { payment: current, alreadyProcessed: true as const };
  }

  await sendBoostStartedNotification(outcome.id);
  return { payment: { ...payment, status: "SUCCESS" as const }, alreadyProcessed: false as const };
}

export async function markBoostPaymentFailed(monetizationPaymentId: string) {
  return db.$transaction(async (tx) => {
    const claim = await tx.monetizationPayment.updateMany({ where: { id: monetizationPaymentId, status: "PENDING" }, data: { status: "FAILED" } });
    if (claim.count === 0) return null;

    const payment = await tx.monetizationPayment.findUniqueOrThrow({ where: { id: monetizationPaymentId } });
    if (payment.boostCampaignId) {
      await tx.boostCampaign.updateMany({ where: { id: payment.boostCampaignId, status: "PENDING_PAYMENT" }, data: { status: "CANCELLED" } });
    }
    return payment;
  });
}

export function listCampaignsForSeller(sellerId: string) {
  return db.boostCampaign.findMany({
    where: { sellerId },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Every number here is derived live from `ProductEvent`/`OrderItem` for the
 * campaign's exact [startDate, endDate] window — never a second counter
 * that could drift from the real event stream.
 */
export async function getCampaignPerformance(campaignId: string) {
  const campaign = await db.boostCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new NotFoundError("Boost campaign");
  if (!campaign.startDate) {
    return { impressions: 0, views: 0, saves: 0, messages: 0, orders: 0, conversionRate: 0 };
  }

  const windowEnd = campaign.endDate && campaign.endDate.getTime() < Date.now() ? campaign.endDate : new Date();
  const where = { productId: campaign.productId, createdAt: { gte: campaign.startDate, lte: windowEnd } };

  const [impressions, views, saves, messages, orders] = await Promise.all([
    db.productEvent.count({ where: { ...where, type: "IMPRESSION" } }),
    db.productEvent.count({ where: { ...where, type: "VIEW" } }),
    db.productEvent.count({ where: { ...where, type: "SAVE" } }),
    db.productEvent.count({ where: { ...where, type: "CONTACT_SELLER" } }),
    db.orderItem.count({ where: { productId: campaign.productId, createdAt: { gte: campaign.startDate, lte: windowEnd } } }),
  ]);

  return { impressions, views, saves, messages, orders, conversionRate: views > 0 ? orders / views : 0 };
}

/** Product ids among the given candidates that currently have a live boost — used by SearchService to add a bounded ranking bonus. */
export async function getActiveBoostProductIds(productIds: string[]): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();
  const now = new Date();
  const active = await db.boostCampaign.findMany({
    where: { productId: { in: productIds }, status: "ACTIVE", startDate: { lte: now }, endDate: { gt: now } },
    select: { productId: true },
  });
  return new Set(active.map((c) => c.productId));
}

/** Daily sweep — completes campaigns past their end date and sends the performance report. */
export async function runBoostExpirySweep() {
  const now = new Date();
  const ended = await db.boostCampaign.findMany({ where: { status: "ACTIVE", endDate: { lt: now } } });

  for (const campaign of ended) {
    const claim = await db.boostCampaign.updateMany({ where: { id: campaign.id, status: "ACTIVE" }, data: { status: "COMPLETED" } });
    if (claim.count === 0) continue;

    const [product, seller, performance] = await Promise.all([
      db.product.findUniqueOrThrow({ where: { id: campaign.productId } }),
      db.sellerProfile.findUniqueOrThrow({ where: { id: campaign.sellerId } }),
      getCampaignPerformance(campaign.id),
    ]);

    await notify({
      event: "BOOST_COMPLETED",
      userId: seller.userId,
      title: "Boost campaign completed",
      message: `Your boost campaign for "${product.title}" has ended.`,
      actionUrl: ROUTES.seller.marketing,
      emailVariables: { productTitle: product.title },
    });
    await notify({
      event: "BOOST_PERFORMANCE_REPORT",
      userId: seller.userId,
      title: "Boost campaign report",
      message: `"${product.title}": ${performance.impressions} impressions, ${performance.views} views, ${performance.orders} orders.`,
      actionUrl: ROUTES.seller.marketing,
    });
  }

  return { completedCount: ended.length };
}
