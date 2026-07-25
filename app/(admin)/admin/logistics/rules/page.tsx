import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getDeliveryRuleForAdmin, listDeliveryHolidays } from "@/services/logistics/delivery-config.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarOff } from "lucide-react";
import { updateDeliveryRuleAction, createDeliveryHolidayAction, deleteDeliveryHolidayAction } from "./actions";

export default async function AdminDeliveryRulesPage() {
  await requireRole(Role.SUPER_ADMIN);
  const [rule, holidays] = await Promise.all([getDeliveryRuleForAdmin(), listDeliveryHolidays()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Delivery rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global thresholds the delivery engine reads on every quote — nothing here requires a code change.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateDeliveryRuleAction} className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Input name="pickupRadiusKm" type="number" step="0.1" min="0" label="Pickup radius (km)" defaultValue={rule.pickupRadiusKm} required />
              <Input name="sameDayRadiusKm" type="number" step="0.1" min="0" label="Same-day radius (km)" defaultValue={rule.sameDayRadiusKm} required />
              <Input name="sameDayCutoffHour" type="number" min="0" max="23" label="Same-day cutoff (hour, 0–23)" defaultValue={rule.sameDayCutoffHour} required />
              <Input name="maxDeliveryDistanceKm" type="number" step="0.1" min="0" label="Max delivery distance (km)" defaultValue={rule.maxDeliveryDistanceKm} required />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="expressAvailable" defaultChecked={rule.expressAvailable} className="h-4 w-4 rounded border-border accent-accent" />
                Express delivery available
              </label>
              <Input name="expressSurcharge" type="number" step="1" min="0" label="Express surcharge (₦)" defaultValue={Number(rule.expressSurcharge)} />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <label className="flex items-center gap-3 text-sm font-medium text-red-800">
                <input type="checkbox" name="emergencyDisableAll" defaultChecked={rule.emergencyDisableAll} className="h-4 w-4 rounded border-border accent-red-600" />
                Emergency: disable all delivery quoting platform-wide
              </label>
              <Input name="emergencyDisableReason" label="Reason shown to buyers" defaultValue={rule.emergencyDisableReason ?? ""} />
            </div>

            <Button type="submit" variant="accent" className="self-start">
              Save rules
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Holiday overrides</CardTitle>
          <CardDescription>Dated exceptions — e.g. no same-day delivery on a public holiday.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {holidays.length === 0 && <EmptyState icon={CalendarOff} title="No holiday overrides" description="Add one below." />}
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="font-medium text-foreground">
                  {holiday.label} · {new Date(holiday.date).toLocaleDateString(undefined, { timeZone: "UTC" })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {holiday.disablesAll ? "Disables all delivery" : holiday.disablesSameDay ? "Disables same-day only" : "No restriction"}
                </p>
              </div>
              <form action={deleteDeliveryHolidayAction}>
                <input type="hidden" name="id" value={holiday.id} />
                <Button type="submit" size="sm" variant="outline">
                  Remove
                </Button>
              </form>
            </div>
          ))}

          <form action={createDeliveryHolidayAction} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <Input name="date" type="date" label="Date" required className="w-44" />
            <Input name="label" label="Label" placeholder="Public holiday" required className="w-48" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="disablesSameDay" defaultChecked className="h-4 w-4 rounded border-border accent-accent" />
              Disables same-day
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="disablesAll" className="h-4 w-4 rounded border-border accent-accent" />
              Disables all delivery
            </label>
            <Button type="submit" variant="accent">
              Add holiday
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
