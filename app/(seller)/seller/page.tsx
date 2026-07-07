import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, ShoppingCart, Package, Eye, MessageCircle, TrendingUp } from "lucide-react";
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
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

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

      {insights.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex flex-col gap-1 p-4 text-sm text-foreground">
            {insights.map((line) => (
              <p key={line}>💡 {line}</p>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Today's revenue" icon={Wallet} value={format(todayRevenue)} />
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
