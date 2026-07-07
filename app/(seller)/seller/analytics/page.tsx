import Image from "next/image";
import { Eye, Heart, Share2, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import {
  getSellerAnalytics,
  getMostViewedProducts,
  getBestSellingCategory,
  getRevenueHistory,
  getCategoryPerformanceInsight,
} from "@/services/analytics/analytics.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default async function SellerAnalyticsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const [analytics, mostViewed, bestCategory, revenueHistory, insight] = await Promise.all([
    getSellerAnalytics(profile.id),
    getMostViewedProducts(profile.id, 5),
    getBestSellingCategory(profile.id),
    getRevenueHistory(profile.id, 14),
    getCategoryPerformanceInsight(profile.id),
  ]);

  const revenueBars = revenueHistory.slice(-7).map((entry) => ({
    label: new Date(entry.date).toLocaleDateString("en-NG", { weekday: "short" }),
    value: Math.round(entry.revenue),
  }));

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
    </div>
  );
}
