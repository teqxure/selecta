import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getOrderDetailForAdmin } from "@/services/orders/order.service";
import { isAppError } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { adminSetOrderStatusAction, releaseTransactionAction, refundTransactionAction } from "./actions";

const ALL_STATUSES = [
  "CREATED",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "DISPUTED",
  "CANCELLED",
] as const;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const { id } = await params;

  let order;
  try {
    order = await getOrderDetailForAdmin(id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const format = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
          <h1 className="font-display text-2xl font-semibold text-foreground">Order #{order.id.slice(-8)}</h1>
          <p className="text-sm text-muted-foreground">
            {order.buyer.firstName} {order.buyer.lastName} · {order.buyer.email}
          </p>
        </div>
        <Badge tone={STATUS_TONE[order.status]}>{order.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {order.payment ? (
            <>
              <p>
                {order.payment.provider} · {format(Number(order.payment.amount), order.payment.currency)} ·{" "}
                <Badge tone={order.payment.status === "HELD_IN_ESCROW" ? "warning" : "neutral"}>{order.payment.status}</Badge>
              </p>
              {order.payment.providerReference && (
                <p className="text-xs text-muted-foreground">Ref: {order.payment.providerReference}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No payment initiated yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seller payouts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
          {order.transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {format(Number(transaction.sellerAmount), transaction.currency)} to seller
                </p>
                <p className="text-xs text-muted-foreground">
                  Gross {format(Number(transaction.amount), transaction.currency)} · Commission{" "}
                  {transaction.commissionRate.toFixed(1)}% ({format(Number(transaction.commissionAmount), transaction.currency)})
                </p>
                <Badge tone={STATUS_TONE[transaction.status] ?? "neutral"}>{transaction.status.replaceAll("_", " ")}</Badge>
              </div>
              {transaction.status === "HELD_IN_ESCROW" && (
                <div className="flex gap-2">
                  <form action={releaseTransactionAction}>
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit" size="sm" variant="accent">
                      Release
                    </Button>
                  </form>
                  <form action={refundTransactionAction}>
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Refund
                    </Button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Override status</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={adminSetOrderStatusAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nextStatus" className="text-sm font-medium text-foreground">
                New status
              </label>
              <select
                id="nextStatus"
                name="nextStatus"
                defaultValue={order.status}
                className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <Input name="note" placeholder="Reason (optional)" className="flex-1" />
            <Button type="submit" variant="accent">
              Apply
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Setting COMPLETED here releases any escrowed transactions immediately, same as a buyer confirming delivery.
          </p>
        </CardContent>
      </Card>

      {order.delivery && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="text-muted-foreground">
              {order.delivery.method} · {order.delivery.status.replaceAll("_", " ")}
              {order.delivery.pickupLocation && ` · ${order.delivery.pickupLocation}`}
            </p>
            {order.delivery.events.map((event) => (
              <p key={event.id} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{event.status.replaceAll("_", " ")}</span>
                {event.note && ` — ${event.note}`} · {event.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline entries={order.statusHistory} />
        </CardContent>
      </Card>
    </div>
  );
}
