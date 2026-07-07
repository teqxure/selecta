import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";

export interface ProductCardProps {
  title: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  sellerName: string;
}

/** Instagram-discovery-style tile: image-forward, minimal chrome. */
export function ProductCard({ title, price, currency = "NGN", imageUrl, sellerName }: ProductCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/5] w-full bg-muted">
        {imageUrl && <Image src={imageUrl} alt={title} fill className="object-cover" />}
      </div>
      <CardContent className="p-3">
        <p className="truncate text-sm font-medium text-secondary-foreground">{title}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-semibold text-accent">
            {new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(price)}
          </span>
          <span className="truncate text-xs text-muted-foreground">{sellerName}</span>
        </div>
      </CardContent>
    </Card>
  );
}
