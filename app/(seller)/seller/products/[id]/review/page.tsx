import Image from "next/image";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getOwnedProductWithDetails } from "@/services/products/product.service";
import { CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { Card, CardContent } from "@/components/ui/Card";
import { PublishButton } from "./publish-button";

export default async function ProductReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const product = await getOwnedProductWithDetails(profile.id, id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Review &amp; publish</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Once submitted, our team reviews new listings before they go live — usually within a few hours.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image) => (
              <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <Image src={image.url} alt="" fill className="object-cover" />
              </div>
            ))}
          </div>

          <div>
            <p className="text-lg font-semibold text-secondary-foreground">{product.title}</p>
            <p className="text-sm text-muted-foreground">
              {product.category.name}
              {product.subcategory ? ` · ${product.subcategory.name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-accent">
              {new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(
                Number(product.discountPrice ?? product.price),
              )}
            </span>
            {product.discountPrice != null && (
              <span className="text-sm text-muted-foreground line-through">
                {new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(
                  Number(product.price),
                )}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{CONDITION_GRADE_LABELS[product.conditionGrade]}</p>
          {product.description && <p className="text-sm text-foreground">{product.description}</p>}
        </CardContent>
      </Card>

      <PublishButton productId={id} />
    </div>
  );
}
