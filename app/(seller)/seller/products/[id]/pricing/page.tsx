import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails, getSuggestedPriceRange } from "@/services/products/product.service";
import { PricingForm } from "./form";

export default async function ProductPricingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const product = await getOwnedProductWithDetails(profile.id, id);
  const suggestedRange = await getSuggestedPriceRange(product.categoryId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">Set a fair price — you can always adjust it later.</p>
      </div>
      <PricingForm
        productId={id}
        isDraft={product.status === "DRAFT"}
        defaultEstimatedValue={product.estimatedValue ? String(product.estimatedValue) : ""}
        defaultPrice={Number(product.price) > 0 ? String(product.price) : ""}
        defaultDiscountPrice={product.discountPrice ? String(product.discountPrice) : ""}
        suggestedRange={suggestedRange}
      />
    </div>
  );
}
