import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { SellerSettingsForm } from "./form";

export default async function SellerSettingsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Store settings</h1>
        {profile.storeSlug && (
          <Link href={ROUTES.store(profile.storeSlug)} className="text-sm font-medium text-accent hover:underline">
            View storefront →
          </Link>
        )}
      </div>
      <SellerSettingsForm
        defaultStoreName={profile.storeName ?? ""}
        defaultBio={profile.bio ?? ""}
        defaultMarketLocation={profile.marketLocation ?? ""}
        defaultCity={profile.city ?? ""}
        defaultState={profile.state ?? ""}
        defaultBannerUrl={profile.bannerUrl ?? undefined}
      />
    </div>
  );
}
