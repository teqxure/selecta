import { TrendingUp, Zap, Users, Rocket } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRevenueOverview, getMonthlyMonetizationRevenueHistory, getTopSpendingSellers } from "@/services/monetization/revenue.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";

export default async function AdminRevenuePage() {
  await requireRole(Role.SUPER_ADMIN);

  const [overview, history, topSellers] = await Promise.all([
    getRevenueOverview(),
    getMonthlyMonetizationRevenueHistory(6),
    getTopSpendingSellers(10),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Revenue" }]}
        title="Seller monetization revenue"
        description="Subscription and boost revenue — summed from the append-only ledger, same as Finance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscription revenue (lifetime)" icon={TrendingUp} value={format(overview.subscriptionRevenue)} />
        <StatCard label="Boost revenue (lifetime)" icon={Zap} value={format(overview.boostRevenue)} />
        <StatCard label="Active subscriptions" icon={Users} value={String(overview.activeSubscriptions)} />
        <StatCard label="Running boost campaigns" icon={Rocket} value={String(overview.runningCampaigns)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monetization revenue — last 6 months</CardTitle>
          <CardDescription>Subscription + boost revenue combined, by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={history.map((h) => ({ label: h.label, value: Math.round(h.subscription + h.boost) }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top spending sellers</CardTitle>
          <CardDescription>Ranked by lifetime subscription + boost spend.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {topSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monetization revenue recorded yet.</p>
          ) : (
            topSellers.map((seller, index) => (
              <div key={seller.sellerId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-secondary-foreground">
                  {index + 1}. {seller.name}
                </span>
                <span className="font-medium text-foreground">{format(seller.totalSpend)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
