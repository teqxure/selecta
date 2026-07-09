"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { createBoostCampaign } from "@/services/monetization/boost.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";
import type { BoostGoal } from "@/generated/prisma/enums";

export interface CreateBoostState {
  error?: string;
}

export async function createBoostCampaignAction(_prevState: CreateBoostState, formData: FormData): Promise<CreateBoostState> {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const productId = String(formData.get("productId") || "");
  const goal = String(formData.get("goal") || "") as BoostGoal;
  const durationDays = Number(formData.get("durationDays"));

  let outcome;
  try {
    outcome = await createBoostCampaign(profile.id, { productId, goal, durationDays });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  if (outcome.activatedImmediately) {
    revalidatePath(ROUTES.seller.marketing);
    return {};
  }

  redirect(outcome.checkoutUrl);
}
