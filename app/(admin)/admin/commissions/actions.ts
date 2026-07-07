"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createCommissionRule, setCommissionRuleActive } from "@/services/platform/commission.service";
import { ROUTES } from "@/lib/constants/routes";

export async function createCommissionRuleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const categoryId = String(formData.get("categoryId") || "") || null;
  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");

  await createCommissionRule(session.userId, {
    categoryId,
    label: String(formData.get("label") || "").trim(),
    percentage: Number(formData.get("percentage")),
    isPromotional: formData.get("isPromotional") === "on",
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
  });

  revalidatePath(ROUTES.admin.commissions);
}

export async function setCommissionRuleActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  await setCommissionRuleActive(session.userId, id, isActive);
  revalidatePath(ROUTES.admin.commissions);
}
