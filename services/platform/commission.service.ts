import "server-only";
import { db } from "@/lib/db";
import { ConflictError, ValidationError } from "@/lib/errors";

/**
 * The single lookup every payment/payout calculation must go through.
 * No commission percentage is ever hardcoded in application code — if
 * this throws, it means Super Admin hasn't configured a platform default
 * rate yet at /admin/commissions, and that is treated as a hard stop
 * rather than silently charging an assumed rate.
 */
export async function getActiveCommissionRateForCategory(categoryId: string | null): Promise<{
  ruleId: string;
  percentage: number;
}> {
  const now = new Date();
  const activeWindow = {
    isActive: true,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ],
  };

  if (categoryId) {
    const categoryRule = await db.commissionRule.findFirst({
      where: { categoryId, ...activeWindow },
      orderBy: [{ isPromotional: "desc" }, { createdAt: "desc" }],
    });
    if (categoryRule) return { ruleId: categoryRule.id, percentage: categoryRule.percentage };
  }

  const defaultRule = await db.commissionRule.findFirst({
    where: { categoryId: null, ...activeWindow },
    orderBy: [{ isPromotional: "desc" }, { createdAt: "desc" }],
  });

  if (!defaultRule) {
    throw new ConflictError(
      "No active platform default commission rule is configured — set one at /admin/commissions before accepting payments",
    );
  }

  return { ruleId: defaultRule.id, percentage: defaultRule.percentage };
}

export function listCommissionRules() {
  return db.commissionRule.findMany({
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { createdAt: "desc" }],
  });
}

export interface CommissionRuleInput {
  categoryId?: string | null;
  label: string;
  percentage: number;
  isPromotional?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

export async function createCommissionRule(adminId: string, input: CommissionRuleInput) {
  if (input.percentage < 0 || input.percentage > 100) {
    throw new ValidationError("Commission percentage must be between 0 and 100");
  }

  return db.$transaction(async (tx) => {
    const rule = await tx.commissionRule.create({
      data: { ...input, categoryId: input.categoryId ?? null, createdById: adminId },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "COMMISSION_RULE_CREATED",
        entityType: "CommissionRule",
        entityId: rule.id,
        metadata: input as object,
      },
    });

    return rule;
  });
}

export async function setCommissionRuleActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const rule = await tx.commissionRule.update({ where: { id }, data: { isActive } });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isActive ? "COMMISSION_RULE_ACTIVATED" : "COMMISSION_RULE_DEACTIVATED",
        entityType: "CommissionRule",
        entityId: id,
      },
    });

    return rule;
  });
}
