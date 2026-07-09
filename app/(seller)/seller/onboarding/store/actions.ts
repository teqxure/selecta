"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { storeSetupSchema } from "@/lib/validators/onboarding";
import { completeStoreSetupStep, getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { updateNotificationPreferences } from "@/services/notifications/preferences.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { OnboardingActionState } from "../personal/actions";

export async function submitStoreSetupAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = storeSetupSchema.safeParse({
    storeName: formData.get("storeName"),
    marketLocation: formData.get("marketLocation"),
    city: formData.get("city"),
    state: formData.get("state"),
    // Checkboxes with a shared `name` land as multiple FormData entries —
    // Object.fromEntries would silently keep only the last one.
    categoryTags: formData.getAll("categoryTags"),
    logoUrl: formData.get("logoUrl"),
    bannerUrl: formData.get("bannerUrl"),
    bio: formData.get("bio"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    facebook: formData.get("facebook"),
    orderUpdatesOptIn: formData.get("orderUpdatesOptIn"),
    sellerUpdatesOptIn: formData.get("sellerUpdatesOptIn"),
    agreementAccepted: formData.get("agreementAccepted"),
  });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    if (profile.onboardingStep < 2) {
      return { error: "Please complete the personal information step first." };
    }
    await completeStoreSetupStep(user.id, profile.id, parsed.data);
    await updateNotificationPreferences(user.id, {
      orderUpdates: parsed.data.orderUpdatesOptIn,
      sellerUpdates: parsed.data.sellerUpdatesOptIn,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.seller.onboarding.verification);
}
