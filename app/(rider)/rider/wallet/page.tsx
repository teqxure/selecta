import Link from "next/link";
import { Wallet as WalletIcon, Banknote, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderWallet } from "@/services/logistics/rider.service";
import { listLedgerEntriesForRider } from "@/services/finance/ledger.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

const LEDGER_ENTRY_LABELS: Record<string, string> = {
  RIDER_PAYOUT_EARNED: "Delivery payout",
  WITHDRAWAL_REQUEST: "Withdrawal requested",
  WITHDRAWAL_PAID: "Withdrawal paid out",
  ADJUSTMENT: "Balance adjustment",
};

export default async function RiderWalletPage() {
  const session = await requireRole(Role.RIDER);
  const [balances, ledgerEntries] = await Promise.all([
    getRiderWallet(session.userId),
    listLedgerEntriesForRider(session.userId, 20),
  ]);

  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Wallet" description="Your delivery earnings." />
        <Link href={ROUTES.rider.withdrawals}>
          <Button variant="accent" size="sm">
            Request withdrawal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available balance" icon={WalletIcon} value={format(balances.available)} />
        <StatCard label="Withdrawn" icon={Banknote} value={format(balances.withdrawn)} />
        <StatCard label="Lifetime earnings" icon={TrendingUp} value={format(balances.lifetime)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {ledgerEntries.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
          {ledgerEntries.map((entry) => {
            const amount = Number(entry.amount);
            return (
              <div key={entry.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{LEDGER_ENTRY_LABELS[entry.type] ?? entry.type}</span>
                    <Badge tone={amount >= 0 ? "success" : "neutral"}>{amount >= 0 ? "Credit" : "Debit"}</Badge>
                  </div>
                  {entry.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}
                  <p className="text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${amount >= 0 ? "text-accent" : "text-muted-foreground"}`}>
                  {amount >= 0 ? "+" : "-"}
                  {format(Math.abs(amount))}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
