import Image from "next/image";
import Link from "next/link";
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
  city?: string | null;
  likeCount: number;
  isSaved?: boolean;
  canSave?: boolean;
}

/** Instagram-discovery-style tile: image-forward, minimal chrome. */
export function ProductCard({
  id,
  title,
  price,
  discountPrice,
  currency = "NGN",
  imageUrl,
  conditionGrade,
  sellerName,
  city,
  likeCount,
  isSaved = false,
  canSave = true,
}: ProductCardProps) {
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);
  const displayPrice = discountPrice ?? price;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/5] w-full bg-muted">
        <Link href={`/products/${id}`} className="absolute inset-0 block">
          {imageUrl && (
            <Image src={imageUrl} alt={title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" />
          )}
        </Link>
        <Badge tone={CONDITION_GRADE_TONE[conditionGrade]} className="pointer-events-none absolute left-2 top-2">
          {CONDITION_GRADE_SHORT_LABELS[conditionGrade] ?? conditionGrade}
        </Badge>
        {canSave && <SaveButton productId={id} initialSaved={isSaved} likeCount={likeCount} className="absolute right-2 top-2" />}
      </div>
      <CardContent className="p-3">
        <Link href={`/products/${id}`}>
          <p className="truncate text-sm font-medium text-secondary-foreground">{title}</p>
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-accent">{format(displayPrice)}</span>
          {discountPrice != null && (
            <span className="text-xs text-muted-foreground line-through">{format(price)}</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{sellerName}</span>
          {city && <span className="truncate">{city}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
