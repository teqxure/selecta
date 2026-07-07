import { Users, ShieldCheck, Wallet, Package } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  SELLER_VERIFIED: "verified a seller",
  SELLER_VERIFICATION_REJECTED: "rejected a seller verification",
  PRODUCT_APPROVED: "approved a listing",
  PRODUCT_REJECTED: "rejected a listing",
  PRODUCT_REMOVED: "removed a listing",
  PRODUCT_FEATURED: "featured a listing",
  PRODUCT_UNFEATURED: "unfeatured a listing",
  USER_STATUS_CHANGED: "changed a user's status",
};

export default async function AdminCommandCenterPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);

  const [totalUsers, pendingVerifications, orderAggregate, productStatusRows, recentActivity] = await Promise.all([
    db.user.count(),
    db.sellerVerification.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ _sum: { totalAmount: true } }),
    db.product.groupBy({ by: ["status"], _count: true }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: true } }),
  ]);

  const productCounts = Object.fromEntries(productStatusRows.map((row) => [row.status, row._count]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Command center</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" icon={Users} value={totalUsers.toLocaleString()} />
        <StatCard label="Pending verifications" icon={ShieldCheck} value={String(pendingVerifications)} />
        <StatCard
          label="Gross merchandise value"
          icon={Wallet}
          value={new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
            Number(orderAggregate._sum.totalAmount ?? 0),
          )}
        />
        <StatCard label="Live listings" icon={Package} value={String(productCounts.ACTIVE ?? 0)} />
      </div>

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
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-secondary-foreground">
                      <span className="font-medium">
                        {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"}
                      </span>{" "}
                      <span className="text-muted-foreground">{ACTION_LABELS[entry.action] ?? entry.action.toLowerCase()}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
