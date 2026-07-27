import Link from "next/link";
import { Users, ShieldCheck, Wallet, Banknote, Gavel, Activity, Plug, Truck, Undo2, Ticket, FileCheck, Bike } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { getFinanceOverview } from "@/services/platform/finance.service";
import { listIntegrationSettings } from "@/services/platform/integration-settings.service";
import { getLiveOperationalCounts, getRecentActivityFeed } from "@/services/insights/executive-insight.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SYSTEM_STATUS_TONE = { OPEN: "success", PAUSED: "warning", CLOSED: "danger" } as const;

export default async function AdminCommandCenterPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);

  const [
    totalUsers,
    activeSellers,
    pendingVerifications,
    openDisputes,
    finance,
    productStatusRows,
    recentActivity,
    recentOrders,
    systemSettings,
    integrations,
    liveCounts,
  ] = await Promise.all([
    db.user.count(),
    db.sellerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    db.sellerVerification.count({ where: { status: "PENDING" } }),
    db.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    getFinanceOverview(),
    db.product.groupBy({ by: ["status"], _count: true }),
    getRecentActivityFeed(8),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { buyer: true } }),
    db.systemSettings.findUnique({ where: { id: "singleton" } }),
    listIntegrationSettings(),
    getLiveOperationalCounts(),
  ]);

  const productCounts = Object.fromEntries(productStatusRows.map((row) => [row.status, row._count]));
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);
  const marketplaceStatus = systemSettings?.marketplaceStatus ?? "OPEN";
  const enabledIntegrationsByCategory = new Map<string, number>();
  for (const setting of integrations) {
    if (setting.isEnabled) {
      enabledIntegrationsByCategory.set(setting.category, (enabledIntegrationsByCategory.get(setting.category) ?? 0) + 1);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Selecta HQ"
        title="Executive Center"
        description="A live snapshot across every center — jump into whatever needs attention."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total users" icon={Users} value={totalUsers.toLocaleString()} />
        <StatCard label="Active sellers" icon={ShieldCheck} value={activeSellers.toLocaleString()} />
        <StatCard label="Gross merchandise value" icon={Wallet} value={format(finance.gmv)} />
        <StatCard label="Pending withdrawals" icon={Banknote} value={String(finance.pendingWithdrawals.count)} />
        <StatCard label="Open disputes" icon={Gavel} value={String(openDisputes)} />
        <StatCard label="System status" icon={Activity} value={marketplaceStatus} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Live orders" icon={Activity} value={liveCounts.liveOrders.toLocaleString()} />
        <StatCard label="Active deliveries" icon={Truck} value={liveCounts.activeDeliveries.toLocaleString()} />
        <StatCard label="Unassigned deliveries" icon={Truck} value={liveCounts.unassignedDeliveries.toLocaleString()} />
        <StatCard label="Documents to review" icon={FileCheck} value={liveCounts.pendingDocuments.toLocaleString()} />
        <StatCard label="Return requests" icon={Undo2} value={liveCounts.pendingReturns.toLocaleString()} />
        <StatCard label="Open support tickets" icon={Ticket} value={liveCounts.openTickets.toLocaleString()} />
        <StatCard label="Rider applications" icon={Bike} value={liveCounts.pendingRiderApplications.toLocaleString()} />
      </div>

      {(pendingVerifications > 0 || finance.pendingWithdrawals.count > 0 || openDisputes > 0 || liveCounts.unassignedDeliveries > 0 || liveCounts.pendingDocuments > 0 || liveCounts.pendingReturns > 0 || liveCounts.openTickets > 0 || liveCounts.pendingRiderApplications > 0) && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle>Pending admin tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {pendingVerifications > 0 && (
              <Link
                href={ROUTES.admin.verificationQueue}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {pendingVerifications} seller verification{pendingVerifications === 1 ? "" : "s"} to review
              </Link>
            )}
            {finance.pendingWithdrawals.count > 0 && (
              <Link
                href={ROUTES.admin.withdrawals}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {finance.pendingWithdrawals.count} withdrawal{finance.pendingWithdrawals.count === 1 ? "" : "s"} awaiting payout ({format(finance.pendingWithdrawals.amount)})
              </Link>
            )}
            {openDisputes > 0 && (
              <Link
                href={ROUTES.admin.disputes}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {openDisputes} dispute{openDisputes === 1 ? "" : "s"} open
              </Link>
            )}
            {liveCounts.unassignedDeliveries > 0 && (
              <Link
                href={ROUTES.admin.logisticsDispatch}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {liveCounts.unassignedDeliveries} delivery{liveCounts.unassignedDeliveries === 1 ? "" : "ies"} awaiting dispatch
              </Link>
            )}
            {liveCounts.pendingDocuments > 0 && (
              <Link
                href={ROUTES.admin.complianceDocuments}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {liveCounts.pendingDocuments} document{liveCounts.pendingDocuments === 1 ? "" : "s"} to review
              </Link>
            )}
            {liveCounts.pendingReturns > 0 && (
              <Link
                href={ROUTES.admin.returns}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {liveCounts.pendingReturns} return{liveCounts.pendingReturns === 1 ? "" : "s"} to review
              </Link>
            )}
            {liveCounts.openTickets > 0 && (
              <Link
                href={ROUTES.admin.supportTickets}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {liveCounts.openTickets} support ticket{liveCounts.openTickets === 1 ? "" : "s"} open
              </Link>
            )}
            {liveCounts.pendingRiderApplications > 0 && (
              <Link
                href={ROUTES.admin.logisticsRiders}
                className="rounded-full border border-accent/30 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {liveCounts.pendingRiderApplications} rider application{liveCounts.pendingRiderApplications === 1 ? "" : "s"} to review
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={[
                { label: "Active", value: productCounts.ACTIVE ?? 0 },
                { label: "Pending", value: productCounts.PENDING_REVIEW ?? 0 },
                { label: "Draft", value: productCounts.DRAFT ?? 0, tone: "muted" },
                { label: "Sold", value: productCounts.SOLD ?? 0 },
                { label: "Rejected", value: productCounts.REJECTED ?? 0, tone: "muted" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing&apos;s happened yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentActivity.map((entry, index) => (
                  <li key={index}>
                    <Link href={entry.href} className="flex items-start justify-between gap-3 text-sm hover:underline">
                      <span className="text-secondary-foreground">
                        <span className="font-medium">{entry.actorLabel}</span>{" "}
                        <span className="text-muted-foreground">{entry.label}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={ROUTES.admin.order(order.id)}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="text-secondary-foreground">
                    {order.buyer.firstName} {order.buyer.lastName} · {format(Number(order.totalAmount))}
                  </span>
                  <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                </Link>
              ))
            )}
            <Link href={ROUTES.admin.orders} className="mt-1 text-sm font-medium text-accent hover:underline">
              View all orders →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration status</CardTitle>
            <CardDescription>
              <Link href={ROUTES.admin.integrations} className="text-accent hover:underline">
                Manage integrations →
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(["PAYMENT", "STORAGE", "EMAIL", "SMS", "AI"] as const).map((category) => {
              const enabledCount = enabledIntegrationsByCategory.get(category) ?? 0;
              return (
                <div key={category} className="flex items-center justify-between text-sm">
                  <span className="text-secondary-foreground">{category}</span>
                  <Badge tone={enabledCount > 0 ? "success" : "neutral"}>
                    {enabledCount > 0 ? `${enabledCount} live` : "Not configured"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
        <Plug className="h-4 w-4 shrink-0" strokeWidth={2} />
        Marketplace status is <Badge tone={SYSTEM_STATUS_TONE[marketplaceStatus]}>{marketplaceStatus}</Badge>
        <Link href={ROUTES.admin.settings} className="ml-auto font-medium text-accent hover:underline">
          Platform settings →
        </Link>
      </div>
    </div>
  );
}
