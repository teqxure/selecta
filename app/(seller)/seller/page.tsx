import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ShoppingCart, Package, Eye, MessageCircle, TrendingUp, PlusCircle, Banknote } from "lucide-react";
import { requireAuth } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import {
  getTodayRevenue,
  getRevenueHistory,
  getCategoryPerformanceInsight,
  getTrendingInsight,
  getMostViewedProducts,
} from "@/services/analytics/analytics.service";
import { getProductStatusCounts } from "@/services/products/product.service";
import { getPendingOrdersCountForSeller, listOrdersForSeller } from "@/services/orders/order.service";
import { getUnreadCountForSeller } from "@/services/messaging/conversation.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { getStoreHealthScore, getSellerRecommendations } from "@/services/insights/seller-insight.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

const HEALTH_LABEL_TONE = {
  Excellent: "success",
  Good: "accent",
  Fair: "warning",
  "Needs improvement": "danger",
} as const;

const IMPACT_TONE = { high: "danger", medium: "warning", low: "neutral" } as const;

export default async function SellerDashboardPage() {
  const session = await requireAuth();
  if (session.role !== Role.SELLER) redirect(ROUTES.admin.sellers);

  const profile = await getSellerProfileByUserId(session.userId);

  const [
    todayRevenue,
    pendingOrders,
    statusCounts,
    unreadMessages,
    revenueHistory,
    categoryInsight,
    trendingInsight,
    topProduct,
    recentOrders,
    balances,
  ] = await Promise.all([
    getTodayRevenue(profile.id),
    getPendingOrdersCountForSeller(profile.id),
    getProductStatusCounts(profile.id),
    getUnreadCountForSeller(profile.id, session.userId),
    getRevenueHistory(profile.id, 14),
    getCategoryPerformanceInsight(profile.id),
    getTrendingInsight(profile.id),
    getMostViewedProducts(profile.id, 1),
    listOrdersForSeller(profile.id),
    getSellerBalances(profile.id),
  ]);
  const [health, recommendations] = await Promise.all([
    getStoreHealthScore(profile.id),
    getSellerRecommendations(profile.id),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);
  const revenueBars = revenueHistory.slice(-7).map((entry) => ({
    label: new Date(entry.date).toLocaleDateString("en-NG", { weekday: "short" }),
    value: Math.round(entry.revenue),
  }));
  const insights = [
    topProduct[0] && topProduct[0].viewCount > 0
      ? `Your "${topProduct[0].title}" got ${topProduct[0].viewCount} views this week.`
      : null,
    trendingInsight ? `${trendingInsight.categoryName} pieces are trending${trendingInsight.city ? ` in ${trendingInsight.city}` : ""}.` : null,
    categoryInsight ? `Your ${categoryInsight.best} pieces perform better than your ${categoryInsight.worst} pieces.` : null,
  ].filter((line): line is string => Boolean(line));

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

      <div className="flex flex-wrap gap-3">
        <Link href={ROUTES.seller.newProduct}>
          <Button variant="accent" size="sm">
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
            Add product
          </Button>
        </Link>
        <Link href={ROUTES.seller.orders}>
          <Button variant="outline" size="sm">
            <ShoppingCart className="h-4 w-4" strokeWidth={2} />
            View orders
          </Button>
        </Link>
        <Link href={ROUTES.seller.withdrawals}>
          <Button variant="outline" size="sm">
            <Banknote className="h-4 w-4" strokeWidth={2} />
            Request withdrawal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Store Health</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <p className="font-display text-3xl font-semibold text-foreground">{health.overall}/100</p>
              <Badge tone={HEALTH_LABEL_TONE[health.label]}>{health.label}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  ["Profile", health.categories.profile],
                  ["Products", health.categories.products],
                  ["Customer Experience", health.categories.customerExperience],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-muted-foreground">{label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-foreground">{value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">You&apos;re all caught up — nothing needs attention right now.</p>
            ) : (
              recommendations.slice(0, 5).map((rec) => (
                <Link
                  key={rec.title}
                  href={rec.actionUrl}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-accent/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-foreground">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.reason}</p>
                  </div>
                  <Badge tone={IMPACT_TONE[rec.impact]} className="shrink-0">
                    {rec.impact}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {insights.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex flex-col gap-1 p-4 text-sm text-foreground">
            {insights.map((line) => (
              <p key={line}>💡 {line}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's revenue" icon={Wallet} value={format(todayRevenue)} />
        <StatCard label="Wallet balance" icon={Banknote} value={format(balances.available)} />
        <StatCard label="Total sales" icon={TrendingUp} value={String(profile.totalSales)} />
        <StatCard label="Pending orders" icon={ShoppingCart} value={String(pendingOrders)} />
        <StatCard label="Active listings" icon={Package} value={String(statusCounts.active)} />
        <StatCard label="Profile views" icon={Eye} value={profile.profileViewCount.toLocaleString()} />
        <StatCard
          label="Customer messages"
          icon={MessageCircle}
          value={String(unreadMessages)}
          trend={unreadMessages > 0 ? { direction: "up", label: "unread" } : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Growth (last 7 days with sales)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBars.length > 0 ? (
              <BarChart data={revenueBars} />
            ) : (
              <p className="text-sm text-muted-foreground">No sales yet — once you sell, growth shows up here.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <li key={order.id} className="flex items-center justify-between text-sm">
                    <span className="text-secondary-foreground">Order #{order.id.slice(-8)}</span>
                    <Badge tone={order.status === "DELIVERED" ? "success" : "neutral"}>{order.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link href={ROUTES.seller.orders} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
              View all orders →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
