import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { SellerSettingsForm } from "./form";

export default async function SellerSettingsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Store settings</h1>
      <SellerSettingsForm
        defaultStoreName={profile.storeName ?? ""}
        defaultBio={profile.bio ?? ""}
        defaultMarketLocation={profile.marketLocation ?? ""}
        defaultCity={profile.city ?? ""}
        defaultState={profile.state ?? ""}
      />
    </div>
  );
}
