import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { OnboardingStoreForm } from "./form";

export default async function OnboardingStorePage() {
  const session = await requireAuth();
  const profile = await getSellerProfileByUserId(session.userId);

  if (profile.onboardingStep < 2) redirect(ROUTES.seller.onboarding.personal);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Set up your store</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell buyers where to find you and what you sell.
        </p>
      </div>
      <OnboardingStoreForm
        defaultStoreName={profile.storeName ?? ""}
        defaultMarketLocation={profile.marketLocation ?? ""}
        defaultCity={profile.city ?? ""}
        defaultState={profile.state ?? ""}
        defaultCategoryTags={profile.categoryTags}
      />
    </div>
  );
}
