"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { createCampaign, setCampaignActive } from "@/services/marketing/campaign.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface CreateCampaignActionState {
  error?: string;
}

export async function createCampaignAction(_prevState: CreateCampaignActionState, formData: FormData): Promise<CreateCampaignActionState> {
  const session = await requirePermission("CREATE_PROMOTIONS");

  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");

  try {
    await createCampaign(session.id, {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim().toLowerCase(),
      description: String(formData.get("description") || "").trim() || null,
      bannerImageUrl: String(formData.get("bannerImageUrl") || "").trim() || null,
      collectionId: String(formData.get("collectionId") || "") || null,
      couponId: String(formData.get("couponId") || "") || null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.marketplaceCampaigns);
  return {};
}

export async function setCampaignActiveAction(formData: FormData) {
  const session = await requirePermission("CREATE_PROMOTIONS");
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  await setCampaignActive(session.id, id, isActive);
  revalidatePath(ROUTES.admin.marketplaceCampaigns);
}
