import Link from "next/link";
import { Users, Repeat, PackageSearch, BrainCircuit, Search, Map } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getBuyerRetention, getRepeatPurchaseRate, getInventoryGapsByCategory } from "@/services/insights/marketplace-insight.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/lib/constants/routes";

export default async function AdminIntelligencePage() {
  await requireRole(Role.SUPER_ADMIN);

  const [retention, repeatPurchase, categoryGaps] = await Promise.all([
    getBuyerRetention(30),
    getRepeatPurchaseRate(),
    getInventoryGapsByCategory(30, 8),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Intelligence" }]}
        title="Intelligence Center"
        description="Buyer behavior and supply gaps, plus every other intelligence view Selecta HQ already has."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Buyer retention (30d)" icon={Users} value={`${Math.round(retention.retentionRate * 100)}%`} />
        <StatCard label="Repeat purchase rate" icon={Repeat} value={`${Math.round(repeatPurchase.repeatRate * 100)}%`} />
        <StatCard label="Repeat buyers" icon={Users} value={`${repeatPurchase.repeatBuyers} / ${repeatPurchase.buyersWithOrders}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category demand vs. supply gaps</CardTitle>
          <CardDescription>Recent view/save activity outpacing active listings — where sellers should list more.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {categoryGaps.length === 0 && (
            <EmptyState icon={PackageSearch} title="No gaps detected" description="Supply currently keeps pace with demand across categories." />
          )}
          {categoryGaps.map((gap) => (
            <div key={gap.categoryId} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <span className="font-medium text-foreground">{gap.categoryName}</span>
              <span className="text-muted-foreground">
                {gap.demand} demand signals · {gap.supply} active listings
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href={ROUTES.admin.marketplaceIntelligence}>
          <Card className="h-full transition-colors hover:border-accent/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <BrainCircuit className="h-5 w-5 text-accent" strokeWidth={2} />
              <p className="font-medium text-foreground">Marketplace intelligence</p>
              <p className="text-sm text-muted-foreground">Store health, category trends, seller retention.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={ROUTES.admin.searchAnalytics}>
          <Card className="h-full transition-colors hover:border-accent/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <Search className="h-5 w-5 text-accent" strokeWidth={2} />
              <p className="font-medium text-foreground">Search analytics</p>
              <p className="text-sm text-muted-foreground">What buyers search for and whether they find it.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href={ROUTES.admin.logisticsHeatMap}>
          <Card className="h-full transition-colors hover:border-accent/40">
            <CardContent className="flex flex-col gap-2 p-5">
              <Map className="h-5 w-5 text-accent" strokeWidth={2} />
              <p className="font-medium text-foreground">Delivery heat map</p>
              <p className="text-sm text-muted-foreground">Geographic demand and delivery density.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
