import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import {
  getProductForPreview,
  getSimilarProducts,
  getSameSellerProducts,
  getRecentlyViewedProducts,
  recordProductView,
} from "@/services/products/search.service";
import { isProductSaved } from "@/services/products/saved-product.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { isAppError } from "@/lib/errors";
import { CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { Badge, CONDITION_GRADE_TONE } from "@/components/ui/Badge";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { SaveButton } from "@/components/marketplace/SaveButton";
import { SellerCard } from "@/components/marketplace/SellerCard";
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

  const [similar, sameSeller, recentlyViewed, saved] = await Promise.all([
    getSimilarProducts(product),
    getSameSellerProducts(product.sellerId, product.id),
    user ? getRecentlyViewedProducts(user.id, product.id) : Promise.resolve([]),
    user ? isProductSaved(user.id, product.id) : Promise.resolve(false),
  ]);

  if (product.status === "ACTIVE") {
    const { ipAddress } = await getRequestMeta();
    await recordProductView(product.id, { userId: user?.id, ipAddress });
  }

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(value);
  const displayPrice = product.discountPrice ?? product.price;
  const sellerName = product.seller.storeName ?? product.seller.businessName;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      {product.status !== "ACTIVE" && (
        <Badge tone="warning">Preview only — status: {product.status.replace("_", " ")}</Badge>
      )}

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <ImageGallery images={product.images} title={product.title} />

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-2xl font-semibold text-foreground sm:text-3xl">{product.title}</h1>
              <SaveButton productId={product.id} initialSaved={saved} likeCount={product.likeCount} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.category.name}
              {product.subcategory ? ` · ${product.subcategory.name}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-semibold text-accent">{format(Number(displayPrice))}</span>
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

          {product.description && <p className="text-sm leading-relaxed text-foreground">{product.description}</p>}

          <SellerCard
            name={sellerName}
            location={product.city ? `${product.city}${product.state ? `, ${product.state}` : ""}` : undefined}
            ratingAverage={product.seller.ratingAverage}
            ratingCount={product.seller.ratingCount}
            isVerified={product.seller.verificationStatus === "VERIFIED"}
          />

          <div className="flex flex-col gap-2 pt-1">
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

      {sameSeller.length > 0 && (
        <ProductSection title={`More from ${sellerName}`}>
          <ProductGrid products={sameSeller} />
        </ProductSection>
      )}

      {recentlyViewed.length > 0 && (
        <ProductSection title="Recently viewed">
          <ProductGrid products={recentlyViewed} />
        </ProductSection>
      )}
    </div>
  );
}
