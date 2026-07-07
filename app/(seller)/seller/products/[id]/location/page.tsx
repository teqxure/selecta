import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails } from "@/services/products/product.service";
import { LocationForm } from "./form";

export default async function ProductLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const product = await getOwnedProductWithDetails(profile.id, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Where can buyers find this?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Helps buyers nearby discover it, and tells them where to pick it up.
        </p>
      </div>
      <LocationForm
        productId={id}
        isDraft={product.status === "DRAFT"}
        defaultState={product.state ?? profile.state ?? ""}
        defaultCity={product.city ?? profile.city ?? ""}
        defaultMarket={product.market ?? profile.marketLocation ?? ""}
        defaultPickupLocation={product.pickupLocation ?? ""}
      />
    </div>
  );
}
