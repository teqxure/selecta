import { Wallet as WalletIcon, Clock, TrendingUp, Banknote } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { listLedgerEntriesForSeller } from "@/services/finance/ledger.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import Link from "next/link";

const LEDGER_ENTRY_LABELS: Record<string, string> = {
  CUSTOMER_PAYMENT: "Order paid (held in escrow)",
  COMMISSION_EARNED: "Platform commission",
  VENDOR_CREDIT: "Released to available balance",
  WITHDRAWAL_REQUEST: "Withdrawal requested",
  WITHDRAWAL_PAID: "Withdrawal paid out",
  REFUND: "Refunded",
  ADJUSTMENT: "Balance adjustment",
};

export default async function SellerWalletPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const [balances, ledgerEntries] = await Promise.all([
    getSellerBalances(profile.id),
    listLedgerEntriesForSeller(profile.id, 20),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Wallet</h1>
        <Link href={ROUTES.seller.withdrawals}>
          <Button variant="accent" size="sm">
            Request withdrawal
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Available balance" icon={WalletIcon} value={format(balances.available)} />
        <StatCard label="Held in escrow" icon={Clock} value={format(balances.held)} />
        <StatCard label="Withdrawn" icon={Banknote} value={format(balances.withdrawn)} />
        <StatCard label="Total earned" icon={TrendingUp} value={format(balances.lifetime)} />
      </div>

      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">
          Funds held in escrow release to your available balance once a delivered order clears — either the buyer
          confirms receipt or Selecta releases it manually. Request a withdrawal any time from your available
          balance.
        </CardContent>
      </Card>

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
                    <span className="text-sm font-medium text-foreground">
                      {LEDGER_ENTRY_LABELS[entry.type] ?? entry.type}
                    </span>
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
