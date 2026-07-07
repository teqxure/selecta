import { redirect } from "next/navigation";
import { Wallet, ShoppingCart, Eye, TrendingUp } from "lucide-react";
import { requireAuth } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getSellerDashboardStats, getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerAnalytics } from "@/services/analytics/analytics.service";
import { getProductStatusCounts } from "@/services/products/product.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

export default async function SellerDashboardPage() {
  const session = await requireAuth();
  if (session.role !== Role.SELLER) redirect(ROUTES.admin.sellers);

  const profile = await getSellerProfileByUserId(session.userId);
  const [stats, analytics, statusCounts] = await Promise.all([
    getSellerDashboardStats(profile.id, session.userId),
    getSellerAnalytics(profile.id),
    getProductStatusCounts(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Command center</p>
          <h1 className="font-display text-2xl font-semibold text-foreground">{profile.storeName ?? "Seller dashboard"}</h1>
          <p className="text-sm text-muted-foreground">{profile.marketLocation}</p>
        </div>
        <Badge tone={STATUS_TONE[profile.verificationStatus]}>{profile.verificationStatus}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet balance"
          icon={Wallet}
          value={new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(
            Number(stats.walletBalance),
          )}
        />
        <StatCard label="Orders" icon={ShoppingCart} value={String(stats.totalOrders)} />
        <StatCard label="Total views" icon={Eye} value={analytics.totalViews.toLocaleString()} />
        <StatCard
          label="Conversion"
          icon={TrendingUp}
          value={`${(analytics.conversionRate * 100).toFixed(1)}%`}
          trend={{ direction: "up", label: `${analytics.totalLikes} likes · ${analytics.totalShares} shares` }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={[
              { label: "Active", value: statusCounts.active },
              { label: "Pending", value: statusCounts.pending },
              { label: "Sold", value: statusCounts.sold },
              { label: "Rejected", value: statusCounts.rejected, tone: "muted" },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
