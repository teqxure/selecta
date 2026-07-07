import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { StatCard } from "@/components/dashboard/StatCard";

export default async function AdminCommandCenterPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);

  const [totalUsers, pendingVerifications, orderAggregate] = await Promise.all([
    db.user.count(),
    db.sellerVerification.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ _sum: { totalAmount: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Command center</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total users" value={String(totalUsers)} />
        <StatCard label="Pending seller verifications" value={String(pendingVerifications)} />
        <StatCard
          label="Gross merchandise value"
          value={new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
            Number(orderAggregate._sum.totalAmount ?? 0),
          )}
        />
      </div>
    </div>
  );
}
