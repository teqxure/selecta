import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listCommissionRules } from "@/services/platform/commission.service";
import { listAllCategoriesFlat } from "@/services/categories/category.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Percent } from "lucide-react";
import { createCommissionRuleAction, setCommissionRuleActiveAction } from "./actions";

export default async function AdminCommissionsPage() {
  await requireRole(Role.SUPER_ADMIN);
  const [rules, categories] = await Promise.all([listCommissionRules(), listAllCategoriesFlat()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Commission rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No commission percentage is ever hardcoded — every payout is calculated from an active rule here. A rule with no
          category is the platform default.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>Category rules override the default. Promotional rules win ties within a category.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rules.length === 0 && (
            <EmptyState
              icon={Percent}
              title="No commission rules configured"
              description="Create a platform default rule below before accepting payments."
            />
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{rule.label}</span>
                  <Badge tone="accent">{rule.percentage}%</Badge>
                  {rule.isPromotional && <Badge tone="warning">Promotional</Badge>}
                  <Badge tone={rule.isActive ? "success" : "neutral"}>{rule.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{rule.category ? rule.category.name : "Platform default"}</p>
                {(rule.startsAt || rule.endsAt) && (
                  <p className="text-xs text-muted-foreground">
                    {rule.startsAt ? new Date(rule.startsAt).toLocaleDateString() : "—"} to{" "}
                    {rule.endsAt ? new Date(rule.endsAt).toLocaleDateString() : "—"}
                  </p>
                )}
              </div>
              <form action={setCommissionRuleActiveAction}>
                <input type="hidden" name="id" value={rule.id} />
                <input type="hidden" name="isActive" value={String(!rule.isActive)} />
                <Button type="submit" size="sm" variant={rule.isActive ? "outline" : "secondary"}>
                  {rule.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New rule</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCommissionRuleAction} className="flex flex-col gap-4">
            <Input name="label" label="Label" placeholder="Platform default" required />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue=""
                className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
              >
                <option value="">Platform default (all categories)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <Input name="percentage" type="number" step="0.1" min="0" max="100" label="Percentage" placeholder="10" required />

            <div className="grid grid-cols-2 gap-4">
              <Input name="startsAt" type="date" label="Starts (optional)" />
              <Input name="endsAt" type="date" label="Ends (optional)" />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPromotional"
                className="h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
              />
              Promotional rate
            </label>

            <Button type="submit" variant="accent" className="self-start">
              Create rule
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
