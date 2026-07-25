import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listCityDeliveryPricing, listDeliveryZones } from "@/services/logistics/delivery-config.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banknote } from "lucide-react";
import { upsertCityDeliveryPricingAction, setCityDeliveryPricingActiveAction } from "./actions";

export default async function AdminCityDeliveryPricingPage() {
  await requireRole(Role.SUPER_ADMIN);
  const [pricing, zones] = await Promise.all([listCityDeliveryPricing(), listDeliveryZones()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">City delivery pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each city can have its own price per zone (e.g. Lagos Zone A ≠ Abuja Zone A). A row with no city is the platform
          default, used for any city without an explicit override.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured pricing</CardTitle>
          <CardDescription>Grouped by city, then by zone.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pricing.length === 0 && (
            <EmptyState
              icon={Banknote}
              title="No delivery pricing configured"
              description="Add at least a platform-default price per zone below before delivery can be charged."
            />
          )}
          {pricing.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{row.city ?? "Platform default"}</span>
                  <Badge tone="accent">{row.zone.label}</Badge>
                  <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.currency} {Number(row.price).toLocaleString()}
                </p>
              </div>
              <form action={setCityDeliveryPricingActiveAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="isActive" value={String(!row.isActive)} />
                <Button type="submit" size="sm" variant={row.isActive ? "outline" : "secondary"}>
                  {row.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Set a price</CardTitle>
          <CardDescription>Leave city blank to set (or update) the platform default for that zone.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={upsertCityDeliveryPricingAction} className="flex flex-wrap items-end gap-3">
            <Input name="city" label="City (blank = default)" placeholder="Lagos" className="w-40" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="zoneId" className="text-sm font-medium text-foreground">
                Zone
              </label>
              <select id="zoneId" name="zoneId" required className="h-11 w-36 rounded-lg border border-border bg-background px-4 text-sm text-foreground">
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.label}
                  </option>
                ))}
              </select>
            </div>
            <Input name="price" type="number" step="1" min="0" label="Price (₦)" placeholder="500" required className="w-32" />
            <Button type="submit" variant="accent">
              Save price
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
