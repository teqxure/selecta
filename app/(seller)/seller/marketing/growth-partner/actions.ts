"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { applyForGrowthPartner } from "@/services/monetization/growth-partner.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface ApplyGrowthPartnerState {
  error?: string;
}

export async function applyForGrowthPartnerAction(
  _prevState: ApplyGrowthPartnerState,
  formData: FormData,
): Promise<ApplyGrowthPartnerState> {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  try {
    await applyForGrowthPartner(profile.id, String(formData.get("message") || ""));
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.growthPartner);
  return {};
}
