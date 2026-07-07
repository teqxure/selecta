import { Wallet, TrendingUp, Clock, Banknote, Undo2, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getFinanceOverview, getMonthlyRevenueHistory } from "@/services/platform/finance.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart } from "@/components/dashboard/BarChart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default async function AdminFinancePage() {
  await requireRole(Role.SUPER_ADMIN);

  const [overview, history] = await Promise.all([getFinanceOverview(), getMonthlyRevenueHistory(6)]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY, maximumFractionDigits: 0 }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Finance</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Gross merchandise value" icon={Wallet} value={format(overview.gmv)} />
        <StatCard label="Commission earned (realized)" icon={TrendingUp} value={format(overview.commissionEarned)} />
        <StatCard label="Held in escrow" icon={Clock} value={format(overview.heldInEscrow)} />
        <StatCard label="Paid out to sellers" icon={Banknote} value={format(overview.payoutsPaid)} />
        <StatCard
          label="Refunded"
          icon={Undo2}
          value={format(overview.refunded.amount)}
          trend={{ direction: "down", label: `${overview.refunded.count} transaction(s)` }}
        />
        <StatCard label="Failed payments" icon={AlertTriangle} value={String(overview.failedPayments)} />
      </div>

      {overview.pendingWithdrawals.count > 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {overview.pendingWithdrawals.count} withdrawal request(s) totaling {format(overview.pendingWithdrawals.amount)} are
            awaiting review at /admin/withdrawals.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gross merchandise value — last 6 months</CardTitle>
          <CardDescription>Total value of transactions created each month, regardless of escrow status.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={history.map((month) => ({ label: month.label, value: Math.round(month.gmv) }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Realized commission — last 6 months</CardTitle>
          <CardDescription>Commission from transactions actually released to sellers.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={history.map((month) => ({ label: month.label, value: Math.round(month.commission), tone: "muted" }))} />
        </CardContent>
      </Card>
    </div>
  );
}
