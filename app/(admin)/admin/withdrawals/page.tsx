import { requirePermission } from "@/lib/auth/rbac";
import { listWithdrawalRequests } from "@/services/payments/withdrawal.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banknote } from "lucide-react";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { markWithdrawalProcessingAction, approveWithdrawalAction, rejectWithdrawalAction } from "./actions";

export default async function AdminWithdrawalsPage() {
  await requirePermission("payouts.manage");
  const withdrawals = await listWithdrawalRequests();

  const format = (value: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Withdrawals</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {withdrawals.length === 0 && (
            <EmptyState icon={Banknote} title="No withdrawal requests" description="Requests from sellers will show up here." />
          )}
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {withdrawal.seller.storeName ?? withdrawal.seller.businessName} — {format(Number(withdrawal.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {withdrawal.seller.user.email} · {withdrawal.bankName} · {withdrawal.accountNumber} · {withdrawal.accountName}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[withdrawal.status] ?? "neutral"}>{withdrawal.status}</Badge>
              </div>

              {(withdrawal.status === "REQUESTED" || withdrawal.status === "PROCESSING") && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {withdrawal.status === "REQUESTED" && (
                    <form action={markWithdrawalProcessingAction}>
                      <input type="hidden" name="id" value={withdrawal.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Mark processing
                      </Button>
                    </form>
                  )}
                  <form action={approveWithdrawalAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={withdrawal.id} />
                    <Input name="notes" placeholder="Notes (optional)" className="h-9" />
                    <Button type="submit" size="sm" variant="accent">
                      Approve &amp; mark paid
                    </Button>
                  </form>
                  <form action={rejectWithdrawalAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={withdrawal.id} />
                    <Input name="notes" placeholder="Reason (optional)" className="h-9" />
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
