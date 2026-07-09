import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";

export function listAllPlans() {
  return db.subscriptionPlan.findMany({ include: { features: true }, orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }] });
}

export function listActivePlans() {
  return db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }] });
}

export async function getPlanById(id: string) {
  const plan = await db.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError("Subscription plan");
  return plan;
}

/** The plan a seller with no subscription history at all is treated as being on. */
export function getDefaultPlan() {
  return db.subscriptionPlan.findFirst({ where: { isDefault: true, isActive: true } });
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export interface SubscriptionPlanInput {
  name: string;
  monthlyPrice: number;
  durationDays: number;
  maxProducts: number | null;
  boostCreditsPerCycle: number;
  hasAnalyticsAccess: boolean;
  hasFeaturedStore: boolean;
  hasPrioritySupport: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export async function createPlan(adminId: string, input: SubscriptionPlanInput) {
  if (input.monthlyPrice < 0) throw new ValidationError("Price cannot be negative");
  if (input.maxProducts !== null && input.maxProducts < 0) throw new ValidationError("Max products cannot be negative");

  const name = sanitizeText(input.name);
  const slug = slugify(name);
  if (!slug) throw new ValidationError("Plan name must contain at least one letter or number");

  return db.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.create({
      data: {
        name,
        slug,
        monthlyPrice: input.monthlyPrice,
        durationDays: input.durationDays,
        maxProducts: input.maxProducts,
        boostCreditsPerCycle: input.boostCreditsPerCycle,
        hasAnalyticsAccess: input.hasAnalyticsAccess,
        hasFeaturedStore: input.hasFeaturedStore,
        hasPrioritySupport: input.hasPrioritySupport,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
        createdById: adminId,
      },
    });

    if (input.isDefault) {
      await tx.subscriptionPlan.updateMany({ where: { id: { not: plan.id } }, data: { isDefault: false } });
    }

    await tx.auditLog.create({
      data: { actorId: adminId, action: "SUBSCRIPTION_PLAN_CREATED", entityType: "SubscriptionPlan", entityId: plan.id, metadata: input as object },
    });

    return plan;
  });
}

export async function updatePlan(adminId: string, planId: string, input: SubscriptionPlanInput) {
  if (input.monthlyPrice < 0) throw new ValidationError("Price cannot be negative");
  if (input.maxProducts !== null && input.maxProducts < 0) throw new ValidationError("Max products cannot be negative");

  const existing = await db.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!existing) throw new NotFoundError("Subscription plan");

  const name = sanitizeText(input.name);

  return db.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name,
        monthlyPrice: input.monthlyPrice,
        durationDays: input.durationDays,
        maxProducts: input.maxProducts,
        boostCreditsPerCycle: input.boostCreditsPerCycle,
        hasAnalyticsAccess: input.hasAnalyticsAccess,
        hasFeaturedStore: input.hasFeaturedStore,
        hasPrioritySupport: input.hasPrioritySupport,
        isDefault: input.isDefault,
        sortOrder: input.sortOrder,
      },
    });

    if (input.isDefault) {
      await tx.subscriptionPlan.updateMany({ where: { id: { not: plan.id } }, data: { isDefault: false } });
    }

    await tx.auditLog.create({
      data: { actorId: adminId, action: "SUBSCRIPTION_PLAN_UPDATED", entityType: "SubscriptionPlan", entityId: plan.id, metadata: input as object },
    });

    return plan;
  });
}

/**
 * The "no deploy needed" mechanism — toggling a `PlanFeature` row takes
 * effect on the plan's sellers' very next request, since
 * `entitlement.service.ts#canAccess` reads it live, not from any cache.
 */
export async function setPlanFeature(adminId: string, planId: string, featureKey: string, enabled: boolean, monthlyLimit: number | null) {
  if (monthlyLimit !== null && monthlyLimit < 0) throw new ValidationError("Monthly limit cannot be negative");

  const feature = await db.planFeature.upsert({
    where: { planId_featureKey: { planId, featureKey } },
    create: { planId, featureKey, enabled, monthlyLimit },
    update: { enabled, monthlyLimit },
  });

  await db.auditLog.create({
    data: { actorId: adminId, action: "PLAN_FEATURE_UPDATED", entityType: "SubscriptionPlan", entityId: planId, metadata: { featureKey, enabled, monthlyLimit } },
  });

  return feature;
}

export async function setPlanActive(adminId: string, planId: string, isActive: boolean) {
  const plan = await db.$transaction(async (tx) => {
    const updated = await tx.subscriptionPlan.update({ where: { id: planId }, data: { isActive } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "SUBSCRIPTION_PLAN_ENABLED" : "SUBSCRIPTION_PLAN_DISABLED", entityType: "SubscriptionPlan", entityId: planId },
    });
    return updated;
  });
  return plan;
}
