import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: string;
  trend?: { direction: "up" | "down"; label: string };
}

export function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-secondary-foreground">{value}</p>
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
