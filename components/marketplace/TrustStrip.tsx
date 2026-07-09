import { Tag, MapPinned, PackageCheck, Star } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

export interface TrustStripProps {
  categoryCount: number;
  cityCount: number;
  completedOrderCount: number;
  averageSellerRating: number;
}

export function TrustStrip({ categoryCount, cityCount, completedOrderCount, averageSellerRating }: TrustStripProps) {
  const stats = [
    { icon: Tag, value: `${categoryCount}+`, label: "categories to explore" },
    { icon: MapPinned, value: `${cityCount}+`, label: "cities served" },
    { icon: PackageCheck, value: `${completedOrderCount.toLocaleString()}+`, label: "orders delivered safely" },
    { icon: Star, value: averageSellerRating.toFixed(1), label: "average seller rating" },
  ];

  return (
    <FadeIn className="border-y border-border bg-secondary/60">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-8 sm:grid-cols-4 sm:gap-4">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold leading-tight text-foreground sm:text-xl">{value}</p>
              <p className="truncate text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
