import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getOrderDetailForBuyer } from "@/services/orders/order.service";
import { verifyAndSyncPayment } from "@/services/payments/checkout.service";
import { isAppError } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { confirmDeliveryAction } from "./actions";
import { DisputeForm } from "./dispute-form";

const DISPUTABLE_STATUSES = new Set(["PAID", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DELIVERED", "COMPLETED"]);

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  try {
    await verifyAndSyncPayment(id);
  } catch {
    // Best-effort — the webhook will still catch up if the provider call fails here.
  }

  let order;
  try {
    order = await getOrderDetailForBuyer(id, session.userId);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const format = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Order #{order.id.slice(-8)}</h1>
        <Badge tone={STATUS_TONE[order.status]}>{order.status.replaceAll("_", " ")}</Badge>
      </div>

      {order.status === "AWAITING_PAYMENT" && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            We&apos;re still waiting to hear back from your payment provider. If you completed payment and this
            doesn&apos;t update shortly, refresh this page.
          </CardContent>
        </Card>
      )}

      {order.status === "DELIVERED" && (
        <Card>
          <CardHeader>
            <CardTitle>Received your order?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Confirming releases payment to the seller(s). Only confirm once you have the item in hand.
            </p>
            <form action={confirmDeliveryAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" variant="accent">
                Confirm delivery received
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.product.images[0] && (
                  <Image src={item.product.images[0].url} alt={item.product.title} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-secondary-foreground">{item.product.title}</p>
                <p className="text-sm text-muted-foreground">
                  Qty {item.quantity} · {format(Number(item.unitPrice), order.currency)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="font-medium text-secondary-foreground">Total</p>
            <p className="text-lg font-semibold text-accent">{format(Number(order.totalAmount), order.currency)}</p>
          </div>
        </CardContent>
      </Card>

      {order.delivery && (order.delivery.pickupLocation || order.delivery.events.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {order.delivery.pickupLocation && (
              <p className="text-sm text-muted-foreground">Pickup location: {order.delivery.pickupLocation}</p>
            )}
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

      {order.status === "DISPUTED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Dispute in review</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Selecta is reviewing a reported problem with this order. We&apos;ll notify you once it&apos;s resolved.
          </CardContent>
        </Card>
      ) : (
        DISPUTABLE_STATUSES.has(order.status) && (
          <Card>
            <CardHeader>
              <CardTitle>Report a problem</CardTitle>
            </CardHeader>
            <CardContent>
              <DisputeForm
                orderId={order.id}
                sellers={Array.from(
                  new Map(
                    order.items.map((item) => [
                      item.product.seller.id,
                      { id: item.product.seller.id, label: item.product.seller.storeName ?? item.product.seller.businessName },
                    ]),
                  ).values(),
                )}
              />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
