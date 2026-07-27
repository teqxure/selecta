import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderProfileByUserId, getRiderActiveDeliveries } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bike } from "lucide-react";
import { setRiderAvailabilityAction } from "./actions";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  OFFLINE: "neutral",
  AVAILABLE: "success",
  ON_DELIVERY: "warning",
  BREAK: "neutral",
};

export default async function RiderDashboardPage() {
  const session = await requireRole(Role.RIDER);
  const [profile, deliveries] = await Promise.all([
    getRiderProfileByUserId(session.userId),
    getRiderActiveDeliveries(session.userId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Your deliveries</h1>
          <p className="text-sm text-muted-foreground">Active deliveries assigned to you.</p>
        </div>
        {profile && <Badge tone={STATUS_TONE[profile.status]}>{profile.status.replaceAll("_", " ")}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Availability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(["AVAILABLE", "BREAK", "OFFLINE"] as const).map((status) => (
            <form key={status} action={setRiderAvailabilityAction}>
              <input type="hidden" name="status" value={status} />
              <Button
                type="submit"
                size="sm"
                variant={profile?.status === status ? "accent" : "outline"}
                disabled={profile?.status === "ON_DELIVERY"}
              >
                {status.replaceAll("_", " ")}
              </Button>
            </form>
          ))}
          {profile?.status === "ON_DELIVERY" && (
            <p className="self-center text-xs text-muted-foreground">Finish your active delivery before changing availability.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {deliveries.length === 0 && (
          <EmptyState icon={Bike} title="No active deliveries" description="You'll see new assignments here as dispatch sends them." />
        )}
        {deliveries.map((delivery) => {
          const address = delivery.order.shippingAddress as { line1?: string; city?: string };
          return (
            <Link key={delivery.id} href={ROUTES.rider.delivery(delivery.id)}>
              <Card className="transition-colors hover:border-accent/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">Order #{delivery.orderId.slice(-8)}</span>
                      <Badge tone="neutral">{delivery.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {address?.line1}, {address?.city}
                    </p>
                  </div>
                  <span className="text-sm text-accent">View →</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
