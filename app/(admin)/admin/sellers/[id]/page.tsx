import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getSellerAnalytics } from "@/services/analytics/analytics.service";
import { listAgents } from "@/services/sellers/seller.service";
import { getProductStatusCounts } from "@/services/products/product.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/dashboard/StatCard";
import { suspendSellerAction, reinstateSellerAction, assignAgentAction } from "./actions";

export default async function AdminSellerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("vendors.manage");
  const { id } = await params;

  const seller = await db.sellerProfile.findUnique({ where: { id }, include: { user: true, agent: true } });
  if (!seller) notFound();

  const [analytics, statusCounts, agents] = await Promise.all([
    getSellerAnalytics(seller.id),
    getProductStatusCounts(seller.id),
    listAgents(),
  ]);

  const isSuspended = seller.verificationStatus === "SUSPENDED";

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
        <Badge tone={STATUS_TONE[seller.verificationStatus]}>{seller.verificationStatus}</Badge>
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
    </div>
  );
}
