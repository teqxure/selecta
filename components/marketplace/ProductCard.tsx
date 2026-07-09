import Image from "next/image";
import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, CONDITION_GRADE_TONE, CONDITION_GRADE_SHORT_LABELS } from "@/components/ui/Badge";
import { SaveButton } from "@/components/marketplace/SaveButton";

export interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  discountPrice?: number | null;
  currency?: string;
  imageUrl?: string;
  conditionGrade: string;
  sellerName: string;
  sellerRating?: number;
  city?: string | null;
  likeCount: number;
  isSaved?: boolean;
  canSave?: boolean;
  isSponsored?: boolean;
}

/** Fashion-content tile: large image, save button, condition badge, price, location, seller rating. */
export function ProductCard({
  id,
  title,
  price,
  discountPrice,
  currency = "NGN",
  imageUrl,
  conditionGrade,
  sellerName,
  sellerRating,
  city,
  likeCount,
  isSaved = false,
  canSave = true,
  isSponsored = false,
}: ProductCardProps) {
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);
  const displayPrice = discountPrice ?? price;
  const hasDiscount = discountPrice != null && discountPrice < price;

  return (
    <Card hoverable className="group overflow-hidden">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Link href={`/products/${id}`} className="absolute inset-0 block">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-sm text-muted-foreground">
              {title.charAt(0)}
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </Link>

        <Badge
          tone={CONDITION_GRADE_TONE[conditionGrade]}
          solid
          className="pointer-events-none absolute left-2 top-2 shadow-sm"
        >
          {CONDITION_GRADE_SHORT_LABELS[conditionGrade] ?? conditionGrade}
        </Badge>
        {hasDiscount && (
          <Badge tone="danger" solid className="pointer-events-none absolute left-2 top-9 shadow-sm">
            Sale
          </Badge>
        )}
        {canSave && (
          <SaveButton productId={id} initialSaved={isSaved} likeCount={likeCount} className="absolute right-2 top-2 shadow-sm" />
        )}
      </div>
      <CardContent className="p-3">
        {isSponsored && <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sponsored</p>}
        <Link href={`/products/${id}`}>
          <p className="truncate text-sm font-medium text-secondary-foreground">{title}</p>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-accent">{format(displayPrice)}</span>
          {hasDiscount && <span className="text-xs text-muted-foreground line-through">{format(price)}</span>}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate">{sellerName}</span>
            {sellerRating != null && sellerRating > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-gold">
                <Star className="h-3 w-3 fill-current" strokeWidth={0} />
                {sellerRating.toFixed(1)}
              </span>
            )}
          </span>
          {city && (
            <span className="flex shrink-0 items-center gap-0.5">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {city}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
