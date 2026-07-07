import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerBalances } from "@/services/payments/payment.service";
import { listWithdrawalsForSeller } from "@/services/payments/withdrawal.service";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { Wallet } from "lucide-react";
import { WithdrawalForm } from "./withdrawal-form";

export default async function SellerWithdrawalsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const [balances, withdrawals] = await Promise.all([
    getSellerBalances(profile.id),
    listWithdrawalsForSeller(profile.id),
  ]);

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Withdrawals</h1>

      <StatCard label="Available balance" icon={Wallet} value={format(balances.available)} />

      <Card>
        <CardHeader>
          <CardTitle>Request a withdrawal</CardTitle>
          <CardDescription>The amount is reserved from your available balance immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <WithdrawalForm availableBalance={balances.available} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {withdrawals.length === 0 && <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>}
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="font-medium text-foreground">{format(Number(withdrawal.amount))}</p>
                <p className="text-xs text-muted-foreground">
                  {withdrawal.bankName} · {withdrawal.accountNumber}
                </p>
                {withdrawal.reviewNotes && <p className="mt-1 text-xs text-muted-foreground">{withdrawal.reviewNotes}</p>}
              </div>
              <Badge tone={STATUS_TONE[withdrawal.status] ?? "neutral"}>{withdrawal.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
