import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails } from "@/services/products/product.service";
import { ImagesForm } from "./form";

export default async function ProductImagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const product = await getOwnedProductWithDetails(profile.id, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Photos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add, remove, or relabel this listing&apos;s photos.</p>
      </div>
      <ImagesForm
        productId={id}
        defaultImages={product.images.map((image) => ({ url: image.url, kind: image.kind }))}
        isDraft={product.status === "DRAFT"}
      />
    </div>
  );
}
