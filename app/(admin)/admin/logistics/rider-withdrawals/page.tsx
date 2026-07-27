import { requirePermission } from "@/lib/auth/rbac";
import { listRiderWithdrawalRequests } from "@/services/logistics/rider-withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banknote } from "lucide-react";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";
import { markRiderWithdrawalProcessingAction, approveRiderWithdrawalAction, rejectRiderWithdrawalAction } from "./actions";

export default async function AdminRiderWithdrawalsPage() {
  await requirePermission("MANAGE_LOGISTICS");
  const withdrawals = await listRiderWithdrawalRequests();

  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: DEFAULT_CURRENCY }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Rider withdrawals" }]}
        title="Rider withdrawals"
        description="Withdrawal requests from in-house delivery riders."
      />

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {withdrawals.length === 0 && (
            <EmptyState icon={Banknote} title="No withdrawal requests" description="Requests from riders will show up here." />
          )}
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">
                    {withdrawal.riderProfile.user.firstName} {withdrawal.riderProfile.user.lastName} — {format(Number(withdrawal.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {withdrawal.riderProfile.user.email} · {withdrawal.bankName} · {withdrawal.accountNumber} · {withdrawal.accountName}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[withdrawal.status] ?? "neutral"}>{withdrawal.status}</Badge>
              </div>

              {(withdrawal.status === "REQUESTED" || withdrawal.status === "PROCESSING") && (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  {withdrawal.status === "REQUESTED" && (
                    <form action={markRiderWithdrawalProcessingAction}>
                      <input type="hidden" name="id" value={withdrawal.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Mark processing
                      </Button>
                    </form>
                  )}
                  <form action={approveRiderWithdrawalAction} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={withdrawal.id} />
                    <Input name="notes" placeholder="Notes (optional)" className="h-9" />
                    <Button type="submit" size="sm" variant="accent">
                      Approve &amp; mark paid
                    </Button>
                  </form>
                  <form action={rejectRiderWithdrawalAction} className="flex items-end gap-2">
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
