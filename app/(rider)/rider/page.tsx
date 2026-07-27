import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderProfileByUserId, getRiderActiveDeliveries, getRiderDashboardStats } from "@/services/logistics/rider.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { StatCard } from "@/components/dashboard/StatCard";
import { FeaturedStatCard } from "@/components/dashboard/FeaturedStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { RiderVerificationStatusBanner } from "@/components/rider/RiderVerificationStatusBanner";
import { Bike, Wallet, CalendarDays, Star, Package } from "lucide-react";
import { setRiderAvailabilityAction } from "./actions";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  OFFLINE: "neutral",
  AVAILABLE: "success",
  ON_DELIVERY: "warning",
  BREAK: "neutral",
};

export default async function RiderDashboardPage() {
  const session = await requireRole(Role.RIDER);
  const [profile, deliveries, stats] = await Promise.all([
    getRiderProfileByUserId(session.userId),
    getRiderActiveDeliveries(session.userId),
    getRiderDashboardStats(session.userId),
  ]);

  const isVerified = profile.verificationStatus === "VERIFIED";
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Your deliveries</h1>
          <p className="text-sm text-muted-foreground">Active deliveries assigned to you.</p>
        </div>
        <Badge tone={STATUS_TONE[profile.status]}>{profile.status.replaceAll("_", " ")}</Badge>
      </div>

      {!isVerified && (
        <RiderVerificationStatusBanner
          verificationStatus={profile.verificationStatus}
          hasSubmission={Boolean(profile.verification)}
          reviewNotes={profile.verification?.reviewNotes}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeaturedStatCard
          className="sm:col-span-2"
          label="Earned this week"
          icon={Wallet}
          value={format(stats.weekEarnings)}
          description={`${stats.deliveriesThisWeek} deliveries this week`}
          tone="accent"
        />
        <StatCard
          label="Rating"
          icon={Star}
          value={profile.ratingCount > 0 ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount})` : "No ratings yet"}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Earned today" icon={CalendarDays} value={format(stats.todayEarnings)} />
        <StatCard label="Deliveries this week" icon={Package} value={String(stats.deliveriesThisWeek)} />
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
                variant={profile.status === status ? "accent" : "outline"}
                disabled={profile.status === "ON_DELIVERY" || !isVerified}
              >
                {status.replaceAll("_", " ")}
              </Button>
            </form>
          ))}
          {profile.status === "ON_DELIVERY" && (
            <p className="self-center text-xs text-muted-foreground">Finish your active delivery before changing availability.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Active deliveries</h2>
          <Link href={ROUTES.rider.history} className="text-sm font-medium text-accent hover:underline">
            View history →
          </Link>
        </div>
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
