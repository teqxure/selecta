import { Activity, TrendingUp, TrendingDown, Users, Star } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import {
  getMarketplaceHealthOverview,
  getTopSellers,
  getCategoryTrends,
  getSellerRetention,
  getProductQualityTrend,
} from "@/services/insights/marketplace-insight.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants/routes";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

export default async function AdminMarketplaceIntelligencePage() {
  await requireRole(Role.SUPER_ADMIN);

  const [health, topSellers, categoryTrends, retention, qualityTrend] = await Promise.all([
    getMarketplaceHealthOverview(),
    getTopSellers(30, 10),
    getCategoryTrends(30),
    getSellerRetention(30),
    getProductQualityTrend(6),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Marketplace intelligence" }]}
        title="Marketplace intelligence"
        description="Store health, category trends, and seller retention — the marketplace-wide read on top of each seller's own intelligence."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Average store health" icon={Activity} value={`${health.averageHealthScore}/100`} />
        <StatCard label="Sellers scored" icon={Users} value={String(health.sellersScored)} />
        <StatCard label="Seller retention (30d)" icon={TrendingUp} value={`${(retention.retentionRate * 100).toFixed(0)}%`} />
        <StatCard label="Excellent stores" icon={Star} value={String(health.distribution.excellent)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store health distribution</CardTitle>
          <CardDescription>Sampled from the {health.sellersScored} most recently active sellers.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            data={[
              { label: "Excellent", value: health.distribution.excellent },
              { label: "Good", value: health.distribution.good },
              { label: "Fair", value: health.distribution.fair },
              { label: "Needs work", value: health.distribution.needsImprovement },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top performing sellers (30 days)</CardTitle>
          <CardDescription>Ranked by real released revenue.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {topSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No released revenue in this window yet.</p>
          ) : (
            topSellers.map((seller, index) => (
              <div key={seller.sellerId} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-secondary-foreground">
                  {index + 1}. {seller.storeName}
                </span>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral">Health {seller.healthScore}</Badge>
                  <span className="font-medium text-foreground">{format(seller.revenue)}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
            <CardDescription>By view volume, last 30 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {categoryTrends.top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough activity yet.</p>
            ) : (
              categoryTrends.top.map((c) => (
                <div key={c.categoryId} className="flex justify-between text-sm">
                  <span className="text-secondary-foreground">{c.categoryName}</span>
                  <span className="text-xs text-muted-foreground">{c.currentViews} views</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" strokeWidth={2} />
              Growing categories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {categoryTrends.growing.length === 0 ? (
              <p className="text-sm text-muted-foreground">No standout growth this window.</p>
            ) : (
              categoryTrends.growing.map((c) => (
                <div key={c.categoryId} className="flex justify-between text-sm">
                  <span className="text-secondary-foreground">{c.categoryName}</span>
                  <span className="text-xs font-medium text-green-600">+{c.growthPct?.toFixed(0)}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" strokeWidth={2} />
              Weak categories
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {categoryTrends.weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notable declines this window.</p>
            ) : (
              categoryTrends.weak.map((c) => (
                <div key={c.categoryId} className="flex justify-between text-sm">
                  <span className="text-secondary-foreground">{c.categoryName}</span>
                  <span className="text-xs font-medium text-red-600">{c.growthPct?.toFixed(0)}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product quality trend</CardTitle>
          <CardDescription>Average quality score of listings, grouped by the month they were created.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={qualityTrend.map((row) => ({ label: row.month, value: row.averageScore }))} />
        </CardContent>
      </Card>
    </div>
  );
}
