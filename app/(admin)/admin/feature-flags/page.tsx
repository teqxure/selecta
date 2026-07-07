import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listFeatureFlags } from "@/services/platform/feature-flags.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Flag } from "lucide-react";
import { setFeatureFlagAction } from "./actions";

export default async function AdminFeatureFlagsPage() {
  await requireRole(Role.SUPER_ADMIN);
  const flags = await listFeatureFlags();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Feature flags</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active flags</CardTitle>
          <CardDescription>Gate rollouts without a redeploy — code checks these via isFeatureEnabled().</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {flags.length === 0 && (
            <EmptyState icon={Flag} title="No feature flags yet" description="Create one below to get started." />
          )}
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{flag.label}</span>
                  <Badge tone={flag.isEnabled ? "success" : "neutral"}>{flag.isEnabled ? "Enabled" : "Disabled"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{flag.key}</p>
                {flag.description && <p className="mt-1 text-sm text-muted-foreground">{flag.description}</p>}
              </div>
              <form action={setFeatureFlagAction}>
                <input type="hidden" name="key" value={flag.key} />
                <input type="hidden" name="label" value={flag.label} />
                <input type="hidden" name="description" value={flag.description ?? ""} />
                {!flag.isEnabled && <input type="hidden" name="isEnabled" value="on" />}
                <Button type="submit" size="sm" variant={flag.isEnabled ? "outline" : "secondary"}>
                  {flag.isEnabled ? "Disable" : "Enable"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New flag</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setFeatureFlagAction} className="flex flex-col gap-4">
            <Input name="key" label="Key" placeholder="checkout_v2" required />
            <Input name="label" label="Label" placeholder="Checkout v2" required />
            <Input name="description" label="Description (optional)" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isEnabled" className="h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]" />
              Enabled immediately
            </label>
            <Button type="submit" variant="accent" className="self-start">
              Create flag
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
