import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string };
  icon?: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-accent/5" aria-hidden />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
        </div>
        <p className="font-display mt-2 text-2xl font-semibold text-secondary-foreground">{value}</p>
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trend.direction === "up" ? "text-green-600" : "text-red-600",
            )}
          >
            {trend.direction === "up" ? "↑" : "↓"} {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
