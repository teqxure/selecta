import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import {
  getTopSearches,
  getZeroResultSearches,
  getTrendingCategories,
  getBuyerInterest,
  getSearchVolumeSummary,
} from "@/services/analytics/search-analytics.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, SearchX, TrendingUp, Percent } from "lucide-react";

export default async function AdminSearchAnalyticsPage() {
  await requireRole(Role.SUPER_ADMIN);

  const [summary, topSearches, zeroResults, trendingCategories, buyerInterest] = await Promise.all([
    getSearchVolumeSummary(30),
    getTopSearches(30),
    getZeroResultSearches(30),
    getTrendingCategories(7),
    getBuyerInterest(7),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Search analytics" }]}
        title="Search & discovery analytics"
        description="What buyers are searching for, what they're finding, and what they're not."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Searches (30d)" icon={Search} value={summary.totalSearches.toLocaleString()} />
        <StatCard label="Zero-result searches" icon={SearchX} value={summary.zeroResultCount.toLocaleString()} />
        <StatCard label="Zero-result rate" icon={Percent} value={`${(summary.zeroResultRate * 100).toFixed(1)}%`} />
        <StatCard label="Trending categories (7d)" icon={TrendingUp} value={String(trendingCategories.length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top searches</CardTitle>
            <CardDescription>Last 30 days, by frequency.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {topSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No searches logged yet.</p>
            ) : (
              topSearches.map((row) => (
                <div key={row.query} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate text-secondary-foreground">{row.query}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.count} searches · ~{row.avgResults} results
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zero-result searches</CardTitle>
            <CardDescription>Buyers looking for something we don&apos;t have — catalog gaps to fill.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {zeroResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">No zero-result searches in this window.</p>
            ) : (
              zeroResults.map((row) => (
                <div key={row.query} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="truncate text-secondary-foreground">{row.query}</span>
                  <Badge tone="warning">{row.count}×</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trending categories</CardTitle>
            <CardDescription>By view activity, last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {trendingCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enough recent activity yet.</p>
            ) : (
              trendingCategories.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="text-secondary-foreground">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{row.count} views</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most viewed</CardTitle>
            <CardDescription>Last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {buyerInterest.mostViewed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No views yet.</p>
            ) : (
              buyerInterest.mostViewed.map((row) => (
                <div key={row.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-secondary-foreground">{row.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most saved</CardTitle>
            <CardDescription>Last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {buyerInterest.mostSaved.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saves yet.</p>
            ) : (
              buyerInterest.mostSaved.map((row) => (
                <div key={row.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-secondary-foreground">{row.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{row.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
