import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";

export interface SellerCardProps {
  name: string;
  location?: string | null;
  ratingAverage: number;
  ratingCount: number;
  isVerified?: boolean;
}

export function SellerCard({ name, location, ratingAverage, ratingCount, isVerified }: SellerCardProps) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/10 font-display text-base font-semibold text-accent">
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <p className="truncate font-medium text-secondary-foreground">{name}</p>
          {isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {ratingCount > 0 ? (
            <span className="flex items-center gap-0.5 text-gold">
              <Star className="h-3 w-3 fill-current" strokeWidth={0} />
              {ratingAverage.toFixed(1)} ({ratingCount})
            </span>
          ) : (
            <span>New seller</span>
          )}
          {location && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {location}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
