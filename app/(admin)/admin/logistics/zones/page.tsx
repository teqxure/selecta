import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listDeliveryZones } from "@/services/logistics/delivery-config.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { MapPinned } from "lucide-react";
import { createDeliveryZoneAction, updateDeliveryZoneAction, setDeliveryZoneActiveAction } from "./actions";

export default async function AdminDeliveryZonesPage() {
  await requireRole(Role.SUPER_ADMIN);
  const zones = await listDeliveryZones();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Delivery zones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distance bands shared across every city (e.g. &ldquo;0–2 km&rdquo;). Set the actual price per city × zone at{" "}
          <span className="font-medium text-foreground">City pricing</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zones</CardTitle>
          <CardDescription>Ordered by minimum distance. A zone with no maximum covers everything beyond it.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {zones.length === 0 && (
            <EmptyState icon={MapPinned} title="No delivery zones configured" description="Create at least one zone below before delivery pricing can work." />
          )}
          {zones.map((zone) => (
            <form key={zone.id} action={updateDeliveryZoneAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4">
              <input type="hidden" name="id" value={zone.id} />
              <Input name="label" label="Label" defaultValue={zone.label} required className="w-36" />
              <Input name="minKm" type="number" step="0.1" min="0" label="Min km" defaultValue={zone.minKm} required className="w-24" />
              <Input name="maxKm" type="number" step="0.1" min="0" label="Max km (blank = unbounded)" defaultValue={zone.maxKm ?? ""} className="w-40" />
              <Input name="sortOrder" type="number" label="Sort order" defaultValue={zone.sortOrder} className="w-24" />
              <Badge tone={zone.isActive ? "success" : "neutral"}>{zone.isActive ? "Active" : "Inactive"}</Badge>
              <Button type="submit" size="sm" variant="secondary">
                Save
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="outline"
                formAction={setDeliveryZoneActiveAction}
                name="isActive"
                value={String(!zone.isActive)}
              >
                {zone.isActive ? "Deactivate" : "Activate"}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createDeliveryZoneAction} className="flex flex-wrap items-end gap-3">
            <Input name="label" label="Label" placeholder="Zone A" required className="w-36" />
            <Input name="minKm" type="number" step="0.1" min="0" label="Min km" placeholder="0" required className="w-24" />
            <Input name="maxKm" type="number" step="0.1" min="0" label="Max km (blank = unbounded)" placeholder="2" className="w-40" />
            <Input name="sortOrder" type="number" label="Sort order" placeholder="0" className="w-24" />
            <Button type="submit" variant="accent">
              Create zone
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
