import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails } from "@/services/products/product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { DetailsForm } from "./form";

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const [product, categories] = await Promise.all([
    getOwnedProductWithDetails(profile.id, id),
    listActiveCategoryTree(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Product details</h1>
        <p className="mt-1 text-sm text-muted-foreground">Help buyers know exactly what they&apos;re getting.</p>
      </div>
      <DetailsForm
        productId={id}
        categories={categories}
        isDraft={product.status === "DRAFT"}
        defaults={{
          title: product.title === "Untitled listing" ? "" : product.title,
          description: product.description ?? "",
          categoryId: product.categoryId,
          subcategoryId: product.subcategoryId ?? "",
          brand: product.brand ?? "",
          color: product.color ?? "",
          gender: product.gender ?? "",
          size: product.size ?? "",
          conditionGrade: product.conditionGrade,
        }}
      />
    </div>
  );
}
