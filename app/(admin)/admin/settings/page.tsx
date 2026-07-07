import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSystemSettings } from "@/services/platform/system-settings.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateSystemSettingsAction } from "./actions";

const TOGGLES = [
  { name: "maintenanceMode", label: "Maintenance mode", help: "Takes the storefront offline for buyers when on." },
  { name: "allowNewSellers", label: "Allow new seller registrations" },
  { name: "allowNewBuyers", label: "Allow new buyer registrations" },
  { name: "requireProductApproval", label: "Require admin approval before listings go live" },
  { name: "requireSellerVerification", label: "Require identity verification before sellers can list" },
] as const;

export default async function AdminSettingsPage() {
  await requireRole(Role.SUPER_ADMIN);
  const settings = await getSystemSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">System settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Platform controls</CardTitle>
          <CardDescription>Changes take effect immediately across the entire marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSystemSettingsAction} className="flex flex-col gap-5">
            <Input name="platformName" label="Platform name" defaultValue={settings.platformName} required />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="marketplaceStatus" className="text-sm font-medium text-foreground">
                Marketplace status
              </label>
              <select
                id="marketplaceStatus"
                name="marketplaceStatus"
                defaultValue={settings.marketplaceStatus}
                className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
              >
                <option value="OPEN">Open</option>
                <option value="PAUSED">Paused</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <Input
              name="maintenanceMessage"
              label="Maintenance message"
              helperText="Shown to buyers only while maintenance mode is on."
              defaultValue={settings.maintenanceMessage ?? ""}
            />

            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              {TOGGLES.map((toggle) => (
                <label key={toggle.name} className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name={toggle.name}
                    defaultChecked={settings[toggle.name] as boolean}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
                  />
                  <span>
                    <span className="font-medium text-foreground">{toggle.label}</span>
                    {"help" in toggle && toggle.help && (
                      <span className="block text-xs text-muted-foreground">{toggle.help}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            <Button type="submit" variant="accent" className="self-start">
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
