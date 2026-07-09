import { ProductCard } from "@/components/marketplace/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Search } from "lucide-react";

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
  seller: { storeName: string | null; businessName: string; ratingAverage: number } | null;
  isSponsored?: boolean;
}

interface ProductGridProps {
  products: GridProduct[];
  savedIds?: Set<string>;
  canSave?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProductGrid({
  products,
  savedIds,
  canSave = true,
  emptyTitle = "We haven't discovered that fit yet.",
  emptyDescription = "Check back soon — new pieces land on Selecta every day.",
}: ProductGridProps) {
  if (products.length === 0) {
    return <EmptyState icon={Search} title={emptyTitle} description={emptyDescription} />;
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
          sellerRating={product.seller?.ratingAverage}
          city={product.city}
          likeCount={product.likeCount}
          isSaved={savedIds?.has(product.id) ?? false}
          canSave={canSave}
          isSponsored={product.isSponsored}
        />
      ))}
    </div>
  );
}
