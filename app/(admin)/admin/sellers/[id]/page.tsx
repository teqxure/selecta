import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { currentUser } from "@/lib/auth/current-user";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { getSellerAnalytics } from "@/services/analytics/analytics.service";
import { getEffectiveLimits } from "@/services/monetization/subscription.service";
import { listAgents } from "@/services/sellers/seller.service";
import { getProductStatusCounts } from "@/services/products/product.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/dashboard/StatCard";
import { suspendSellerAction, reinstateSellerAction, assignAgentAction, manualAdjustmentAction } from "./actions";

export default async function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("vendors.manage");
  const { id } = await params;

  const seller = await db.sellerProfile.findUnique({ where: { id }, include: { user: true, agent: true } });
  if (!seller) notFound();

  const [analytics, statusCounts, agents, viewer, balances, limits] = await Promise.all([
    getSellerAnalytics(seller.id),
    getProductStatusCounts(seller.id),
    listAgents(),
    currentUser(),
    getSellerBalances(seller.id),
    getEffectiveLimits(seller.id),
  ]);

  const isSuspended = seller.verificationStatus === "SUSPENDED";
  const isSuperAdmin = viewer?.role === Role.SUPER_ADMIN;
  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {seller.storeName ?? seller.businessName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {seller.user.firstName} {seller.user.lastName} · {seller.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {limits.hasPrioritySupport && <Badge tone="accent">Priority support</Badge>}
          <Badge tone={STATUS_TONE[seller.verificationStatus]}>{seller.verificationStatus}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active listings" value={String(statusCounts.active)} />
        <StatCard label="Total sales" value={String(seller.totalSales)} />
        <StatCard label="Total views" value={analytics.totalViews.toLocaleString()} />
        <StatCard label="Followers" value={String(seller.followerCount)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {isSuspended ? (
            <form action={reinstateSellerAction}>
              <input type="hidden" name="sellerProfileId" value={seller.id} />
              <Button type="submit" variant="accent" size="sm">
                Reinstate seller
              </Button>
            </form>
          ) : (
            <form action={suspendSellerAction} className="flex items-center gap-2">
              <input type="hidden" name="sellerProfileId" value={seller.id} />
              <input
                type="text"
                name="notes"
                placeholder="Reason (optional)"
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <Button type="submit" variant="outline" size="sm">
                Suspend seller
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent assignment</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignAgentAction} className="flex items-center gap-2">
            <input type="hidden" name="sellerProfileId" value={seller.id} />
            <select
              name="agentUserId"
              defaultValue={seller.agentId ?? ""}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="">No agent assigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="secondary">
              Save
            </Button>
          </form>
          {agents.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No agent accounts exist yet — agents are created by Selecta staff, not self-registered.
            </p>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Wallet &amp; manual adjustment</CardTitle>
            <CardDescription>
              Available {format(balances.available)} · Held in escrow {format(balances.held)} · Withdrawn{" "}
              {format(balances.withdrawn)} · Lifetime {format(balances.lifetime)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={manualAdjustmentAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="sellerProfileId" value={seller.id} />
              <Input
                name="amount"
                type="number"
                step="0.01"
                label="Amount"
                helperText="Positive to credit, negative to debit"
                placeholder="1000 or -1000"
                className="w-40"
                required
              />
              <Input name="reason" label="Reason" placeholder="Required — shown to the seller" className="flex-1" required />
              <Button type="submit" variant="accent" size="sm">
                Apply adjustment
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
