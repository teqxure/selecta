import Image from "next/image";
import { Eye, Heart, Share2, TrendingUp, Search, MousePointerClick, ShoppingBag, Repeat, Wallet, Package, MessageCircle, Tag } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import {
  getSellerAnalytics,
  getMostViewedProducts,
  getBestSellingCategory,
  getRevenueHistory,
  getCategoryPerformanceInsight,
  getSearchInsights,
} from "@/services/analytics/analytics.service";
import {
  getPerformanceOverview,
  getProductPerformanceBreakdown,
  getInventoryIntelligence,
  getCustomerInsights,
  getMessagingAnalytics,
} from "@/services/insights/seller-insight.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

export default async function SellerAnalyticsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const [
    analytics,
    mostViewed,
    bestCategory,
    revenueHistory,
    insight,
    searchInsights,
    overview,
    productPerformance,
    inventory,
    customerInsights,
    messagingAnalytics,
  ] = await Promise.all([
    getSellerAnalytics(profile.id),
    getMostViewedProducts(profile.id, 5),
    getBestSellingCategory(profile.id),
    getRevenueHistory(profile.id, 14),
    getCategoryPerformanceInsight(profile.id),
    getSearchInsights(profile.id),
    getPerformanceOverview(profile.id, 30),
    getProductPerformanceBreakdown(profile.id, 5),
    getInventoryIntelligence(profile.id),
    getCustomerInsights(profile.id),
    getMessagingAnalytics(profile.id),
  ]);

  const revenueBars = revenueHistory.slice(-7).map((entry) => ({
    label: new Date(entry.date).toLocaleDateString("en-NG", { weekday: "short" }),
    value: Math.round(entry.revenue),
  }));
  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Analytics</h1>

      {insight && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 text-sm text-foreground">
            💡 Your <strong>{insight.best}</strong> pieces get more views than your <strong>{insight.worst}</strong>{" "}
            pieces — consider listing more of what&apos;s working.
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Performance overview (last 30 days)</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Revenue" icon={Wallet} value={format(overview.revenue)} trend={overview.revenueGrowthPct !== null ? { direction: overview.revenueGrowthPct >= 0 ? "up" : "down", label: `${Math.abs(overview.revenueGrowthPct).toFixed(0)}% vs prior 30d` } : undefined} />
          <StatCard label="Orders" icon={ShoppingBag} value={String(overview.orderCount)} trend={overview.orderGrowthPct !== null ? { direction: overview.orderGrowthPct >= 0 ? "up" : "down", label: `${Math.abs(overview.orderGrowthPct).toFixed(0)}% vs prior 30d` } : undefined} />
          <StatCard label="Average order value" icon={TrendingUp} value={format(overview.averageOrderValue)} />
          <StatCard label="Returning customers" icon={Repeat} value={`${(overview.returningCustomerRate * 100).toFixed(0)}%`} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total views" icon={Eye} value={analytics.totalViews.toLocaleString()} />
        <StatCard label="Total likes" icon={Heart} value={analytics.totalLikes.toLocaleString()} />
        <StatCard label="Total shares" icon={Share2} value={analytics.totalShares.toLocaleString()} />
        <StatCard label="Conversion" icon={TrendingUp} value={`${(analytics.conversionRate * 100).toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (last 7 days with sales)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBars.length > 0 ? (
              <BarChart data={revenueBars} />
            ) : (
              <p className="text-sm text-muted-foreground">No released payments yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best selling category</CardTitle>
          </CardHeader>
          <CardContent>
            {bestCategory ? (
              <p className="text-2xl font-semibold text-accent">
                {bestCategory.name}{" "}
                <span className="text-sm font-normal text-muted-foreground">({bestCategory.count} sold)</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What&apos;s selling</CardTitle>
            <CardDescription>Your top listings by revenue.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {productPerformance.topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              productPerformance.topPerformers.map((p) => (
                <div key={p.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-secondary-foreground">{p.title}</span>
                  <span className="shrink-0 font-medium text-foreground">{format(p.revenue)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Active listings with views but zero sales.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {productPerformance.underperformers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing flagged right now.</p>
            ) : (
              productPerformance.underperformers.map((p) => (
                <div key={p.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-secondary-foreground">{p.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{p.viewCount} views · quality {p.qualityScore}/100</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most viewed products</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mostViewed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            mostViewed.map((product) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.images[0] && (
                    <Image src={product.images[0].url} alt={product.title} fill className="object-cover" />
                  )}
                </div>
                <p className="flex-1 truncate text-sm text-secondary-foreground">{product.title}</p>
                <p className="text-sm font-medium text-muted-foreground">{product.viewCount} views</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search performance (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Search appearances" icon={Search} value={searchInsights.impressions.toLocaleString()} />
            <StatCard label="Views" icon={MousePointerClick} value={searchInsights.views.toLocaleString()} />
            <StatCard label="Saves" icon={Heart} value={searchInsights.saves.toLocaleString()} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-secondary-foreground">Keywords buyers used to find you</p>
            {searchInsights.popularKeywords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching searches yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {searchInsights.popularKeywords.map((keyword) => (
                  <Badge key={keyword.query} tone="neutral">
                    {keyword.query} · {keyword.count}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Discovery & engagement (last 30 days)</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Search impressions" value={overview.discovery.impressions.toLocaleString()} />
          <StatCard label="Direct views" value={overview.discovery.directViews.toLocaleString()} />
          <StatCard label="Saves" value={overview.discovery.saves.toLocaleString()} />
          <StatCard label="Shares" value={overview.discovery.shares.toLocaleString()} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" strokeWidth={2} />
              Inventory intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-1.5 text-sm font-medium text-secondary-foreground">Fastest selling</p>
              {inventory.fastMovers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not enough sales yet.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {inventory.fastMovers.slice(0, 3).map((p) => (
                    <li key={p.productId} className="flex justify-between text-secondary-foreground">
                      <span className="truncate">{p.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.daysToSell}d to sell</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {inventory.slowMovers.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-secondary-foreground">Needs attention</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {inventory.slowMovers.slice(0, 3).map((p) => (
                    <li key={p.productId} className="flex justify-between text-secondary-foreground">
                      <span className="truncate">{p.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.daysListed}d listed, {p.viewCount} views</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {inventory.restockSuggestions.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-secondary-foreground">List more of what sells</p>
                <div className="flex flex-wrap gap-1.5">
                  {inventory.restockSuggestions.map((s) => (
                    <Badge key={s.label} tone="accent">
                      {s.label} · sold {s.count}×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer insights</CardTitle>
            <CardDescription>Aggregate only — never individual buyer details.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total customers" value={String(customerInsights.totalCustomers)} />
              <StatCard label="Returning" value={`${(customerInsights.returningRate * 100).toFixed(0)}%`} />
            </div>
            {customerInsights.topLocations.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-secondary-foreground">Top buyer locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {customerInsights.topLocations.map((l) => (
                    <Badge key={l.location} tone="neutral">
                      {l.location} · {l.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {customerInsights.topCategoriesPurchased.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-secondary-foreground">What they buy</p>
                <div className="flex flex-wrap gap-1.5">
                  {customerInsights.topCategoriesPurchased.map((c) => (
                    <Badge key={c.categoryName} tone="neutral">
                      {c.categoryName} · {c.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-accent" strokeWidth={2} />
            Messaging & offers
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Response rate" value={`${(messagingAnalytics.responseRate * 100).toFixed(0)}%`} />
          <StatCard
            label="Avg. reply time"
            value={messagingAnalytics.averageReplyTimeHours !== null ? `${messagingAnalytics.averageReplyTimeHours.toFixed(1)}h` : "—"}
          />
          <StatCard label="Message → purchase" value={`${(messagingAnalytics.messageToPurchaseRate * 100).toFixed(0)}%`} />
          <StatCard
            label="Offer acceptance"
            icon={Tag}
            value={messagingAnalytics.offerAcceptanceRate !== null ? `${(messagingAnalytics.offerAcceptanceRate * 100).toFixed(0)}%` : "—"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
