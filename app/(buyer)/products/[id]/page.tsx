import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { getProductForPreview, getSimilarProducts, recordView } from "@/services/products/product.service";
import { isProductSaved } from "@/services/products/saved-product.service";
import { isAppError } from "@/lib/errors";
import { CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { Badge, CONDITION_GRADE_TONE } from "@/components/ui/Badge";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { SaveButton } from "@/components/marketplace/SaveButton";
import { ImageGallery } from "./image-gallery";
import { ContactSellerButton } from "./contact-seller-button";
import { AddToCartButton } from "./add-to-cart-button";
import { ShareButton } from "./share-button";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();

  let product;
  try {
    product = await getProductForPreview(id, user?.id ?? "", user?.role ?? "");
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const [similar, saved] = await Promise.all([
    getSimilarProducts(product),
    user ? isProductSaved(user.id, product.id) : Promise.resolve(false),
  ]);

  if (product.status === "ACTIVE") {
    await recordView(product.id, user?.id);
  }

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(value);
  const displayPrice = product.discountPrice ?? product.price;
  const sellerName = product.seller.storeName ?? product.seller.businessName;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      {product.status !== "ACTIVE" && (
        <Badge tone="warning">Preview only — status: {product.status.replace("_", " ")}</Badge>
      )}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ImageGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{product.title}</h1>
              <SaveButton productId={product.id} initialSaved={saved} likeCount={product.likeCount} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.category.name}
              {product.subcategory ? ` · ${product.subcategory.name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-accent">{format(Number(displayPrice))}</span>
            {product.discountPrice != null && (
              <span className="text-base text-muted-foreground line-through">{format(Number(product.price))}</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={CONDITION_GRADE_TONE[product.conditionGrade]}>
              {CONDITION_GRADE_LABELS[product.conditionGrade]}
            </Badge>
            {product.size && <Badge tone="neutral">Size {product.size}</Badge>}
            {product.color && <Badge tone="neutral">{product.color}</Badge>}
          </div>

          {product.description && <p className="text-sm text-foreground">{product.description}</p>}

          <div className="rounded-xl border border-border bg-secondary p-3 text-sm">
            <p className="font-medium text-secondary-foreground">{sellerName}</p>
            <p className="text-muted-foreground">
              {product.city ? `${product.city}${product.state ? `, ${product.state}` : ""}` : "Location not set"}
              {" · "}★ {product.seller.ratingAverage.toFixed(1)} ({product.seller.ratingCount})
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <AddToCartButton productId={product.id} />
            <ContactSellerButton productId={product.id} isLoggedIn={Boolean(user)} />
            <ShareButton productId={product.id} title={product.title} />
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <ProductSection title="Similar items">
          <ProductGrid products={similar} />
        </ProductSection>
      )}
    </div>
  );
}
