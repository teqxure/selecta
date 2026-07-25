import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import {
  getDemandByCity,
  getSupplyByCity,
  getFastestGrowingCities,
  getLowInventoryAreas,
  getTopSellingDistricts,
  getTopPerformingMarkets,
} from "@/services/insights/geo-insight.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { BarChart } from "@/components/dashboard/BarChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { Map } from "lucide-react";

export default async function AdminLogisticsHeatMapPage() {
  await requireRole(Role.SUPER_ADMIN);

  const [demand, supply, growing, lowInventory, topDistricts, topMarkets] = await Promise.all([
    getDemandByCity(30, 10),
    getSupplyByCity(10),
    getFastestGrowingCities(10),
    getLowInventoryAreas(30, 10),
    getTopSellingDistricts(30, 10),
    getTopPerformingMarkets(30, 10),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Location intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranked by city/market — not a geographic map (no maps provider is integrated yet). A real tile-based heat map is
          future work once one is chosen.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Highest demand</CardTitle>
            <CardDescription>Buyer views/saves by listing city, last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {demand.length === 0 ? (
              <EmptyState icon={Map} title="Not enough data yet" description="Demand will appear here once buyers start browsing." />
            ) : (
              <BarChart data={demand.map((row) => ({ label: row.city, value: row.count }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Highest supply</CardTitle>
            <CardDescription>Active listings by city.</CardDescription>
          </CardHeader>
          <CardContent>
            {supply.length === 0 ? (
              <EmptyState icon={Map} title="No active listings yet" description="Supply will appear here once sellers list products." />
            ) : (
              <BarChart data={supply.map((row) => ({ label: row.city, value: row.count, tone: "muted" as const }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fastest growing locations</CardTitle>
            <CardDescription>New listings this week vs. the week before.</CardDescription>
          </CardHeader>
          <CardContent>
            {growing.length === 0 ? (
              <EmptyState icon={Map} title="Not enough data yet" description="Growth trends will appear once listings accumulate week over week." />
            ) : (
              <BarChart data={growing.map((row) => ({ label: row.city, value: row.growth }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low inventory areas</CardTitle>
            <CardDescription>Real buyer demand with comparatively little active supply — good seller-recruitment targets.</CardDescription>
          </CardHeader>
          <CardContent>
            {lowInventory.length === 0 ? (
              <EmptyState icon={Map} title="No under-supplied cities detected" description="Supply currently keeps pace with demand everywhere with signal." />
            ) : (
              <BarChart data={lowInventory.map((row) => ({ label: row.city, value: row.count, tone: "muted" as const }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top selling districts</CardTitle>
            <CardDescription>Units sold by market/stall, last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {topDistricts.length === 0 ? (
              <EmptyState icon={Map} title="No sales yet" description="Top-selling markets will appear here once orders complete." />
            ) : (
              <BarChart data={topDistricts.map((row) => ({ label: row.label, value: row.value }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top performing markets</CardTitle>
            <CardDescription>Revenue by market/stall, last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {topMarkets.length === 0 ? (
              <EmptyState icon={Map} title="No revenue yet" description="Top-performing markets will appear here once orders complete." />
            ) : (
              <BarChart data={topMarkets.map((row) => ({ label: row.label, value: row.value }))} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
