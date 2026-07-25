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
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-6 px-6 py-8 sm:grid-cols-4 sm:divide-x sm:divide-border">
        {stats.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex items-center gap-3 sm:justify-center sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
              <Icon className="h-5 w-5 text-accent" strokeWidth={2} />
            </span>
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
