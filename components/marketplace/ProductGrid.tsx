import { ProductCard } from "@/components/marketplace/ProductCard";

export interface GridProduct {
  id: string;
  title: string;
  price: unknown;
  discountPrice: unknown;
  currency: string;
  conditionGrade: string;
  city: string | null;
  likeCount: number;
  images: { url: string }[];
  seller: { storeName: string | null; businessName: string } | null;
}

interface ProductGridProps {
  products: GridProduct[];
  savedIds?: Set<string>;
  canSave?: boolean;
}

export function ProductGrid({ products, savedIds, canSave = true }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing here yet — check back soon.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          title={product.title}
          price={Number(product.price)}
          discountPrice={product.discountPrice != null ? Number(product.discountPrice) : null}
          currency={product.currency}
          imageUrl={product.images[0]?.url}
          conditionGrade={product.conditionGrade}
          sellerName={product.seller?.storeName ?? product.seller?.businessName ?? "Selecta seller"}
          city={product.city}
          likeCount={product.likeCount}
          isSaved={savedIds?.has(product.id) ?? false}
          canSave={canSave}
        />
      ))}
    </div>
  );
}
