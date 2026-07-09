"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createPlan, updatePlan, setPlanActive } from "@/services/monetization/subscription-plan.service";
import { ROUTES } from "@/lib/constants/routes";
import type { SubscriptionPlanInput } from "@/services/monetization/subscription-plan.service";

function readPlanInput(formData: FormData): SubscriptionPlanInput {
  const maxProductsRaw = String(formData.get("maxProducts") || "").trim();
  return {
    name: String(formData.get("name") || "").trim(),
    monthlyPrice: Number(formData.get("monthlyPrice")),
    durationDays: Number(formData.get("durationDays")),
    maxProducts: maxProductsRaw === "" ? null : Number(maxProductsRaw),
    boostCreditsPerCycle: Number(formData.get("boostCreditsPerCycle") || 0),
    hasAnalyticsAccess: formData.get("hasAnalyticsAccess") === "on",
    hasFeaturedStore: formData.get("hasFeaturedStore") === "on",
    hasPrioritySupport: formData.get("hasPrioritySupport") === "on",
    isDefault: formData.get("isDefault") === "on",
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
}

export async function createPlanAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  await createPlan(session.userId, readPlanInput(formData));
  revalidatePath(ROUTES.admin.plans);
}

export async function updatePlanAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const planId = String(formData.get("planId"));
  await updatePlan(session.userId, planId, readPlanInput(formData));
  revalidatePath(ROUTES.admin.plans);
}

export async function setPlanActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const planId = String(formData.get("planId"));
  const isActive = formData.get("isActive") === "true";
  await setPlanActive(session.userId, planId, isActive);
  revalidatePath(ROUTES.admin.plans);
}
