import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listAllPlans } from "@/services/monetization/subscription-plan.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/lib/constants/routes";
import { createPlanAction, updatePlanAction, setPlanActiveAction, setPlanFeatureAction } from "./actions";
import type { SubscriptionPlan, PlanFeature } from "@/generated/prisma/client";

const checkboxClassName = "h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]";

/** New feature keys land here as they're built — each is just a row Super Admin can flip on per plan, no code deploy. */
const EXTRA_FEATURES = [{ key: "AI_PRODUCT_WRITER", label: "AI Product Writer" }] as const;

function ExtraFeatureRow({ planId, feature, label, featureKey }: { planId: string; feature?: PlanFeature; label: string; featureKey: string }) {
  return (
    <form action={setPlanFeatureAction} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="featureKey" value={featureKey} />
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" name="enabled" defaultChecked={feature?.enabled} className={checkboxClassName} />
        {label}
      </label>
      <Input
        name="monthlyLimit"
        type="number"
        min="0"
        placeholder="Unlimited"
        defaultValue={feature?.monthlyLimit ?? undefined}
        className="h-9 w-32"
      />
      <span className="text-xs text-muted-foreground">uses/month</span>
      <Button type="submit" size="sm" variant="outline">
        Save
      </Button>
    </form>
  );
}

function PlanFields({ plan }: { plan?: SubscriptionPlan }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input name="name" label="Name" placeholder="Plus" defaultValue={plan?.name} required />
        <Input name="monthlyPrice" type="number" step="0.01" min="0" label="Price (₦)" defaultValue={plan ? Number(plan.monthlyPrice) : undefined} required />
        <Input name="durationDays" type="number" min="1" label="Duration (days)" defaultValue={plan?.durationDays ?? 30} required />
        <Input name="maxProducts" type="number" min="0" label="Max products (blank = unlimited)" defaultValue={plan?.maxProducts ?? undefined} />
        <Input name="boostCreditsPerCycle" type="number" min="0" label="Boost credits per cycle" defaultValue={plan?.boostCreditsPerCycle ?? 0} />
        <Input name="sortOrder" type="number" label="Sort order" defaultValue={plan?.sortOrder ?? 0} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasAnalyticsAccess" defaultChecked={plan?.hasAnalyticsAccess} className={checkboxClassName} />
          Analytics access
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasFeaturedStore" defaultChecked={plan?.hasFeaturedStore} className={checkboxClassName} />
          Featured store
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hasPrioritySupport" defaultChecked={plan?.hasPrioritySupport} className={checkboxClassName} />
          Priority support
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDefault" defaultChecked={plan?.isDefault} className={checkboxClassName} />
          Default plan for new sellers
        </label>
      </div>
    </>
  );
}

export default async function AdminPlansPage() {
  await requireRole(Role.SUPER_ADMIN);
  const plans = await listAllPlans();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Plans" }]}
        title="Subscription plans"
        description="Every price and benefit sellers see in Growth Center comes from here — nothing is hardcoded."
      />

      {plans.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              <div className="flex items-center gap-2">
                {plan.isDefault && <Badge tone="accent">Default</Badge>}
                <Badge tone={plan.isActive ? "success" : "neutral"}>{plan.isActive ? "Active" : "Disabled"}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <form action={updatePlanAction} className="flex flex-col gap-4">
              <input type="hidden" name="planId" value={plan.id} />
              <PlanFields plan={plan} />
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="accent">
                  Save changes
                </Button>
              </div>
            </form>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Additional features</p>
              {EXTRA_FEATURES.map((f) => (
                <ExtraFeatureRow
                  key={f.key}
                  planId={plan.id}
                  featureKey={f.key}
                  label={f.label}
                  feature={plan.features.find((row) => row.featureKey === f.key)}
                />
              ))}
            </div>
            <form action={setPlanActiveAction} className="self-start">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="isActive" value={String(!plan.isActive)} />
              <Button type="submit" size="sm" variant={plan.isActive ? "outline" : "secondary"}>
                {plan.isActive ? "Disable plan" : "Enable plan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>New plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPlanAction} className="flex flex-col gap-4">
            <PlanFields />
            <Button type="submit" variant="accent" className="self-start">
              Create plan
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
