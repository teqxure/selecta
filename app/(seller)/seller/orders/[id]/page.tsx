import Image from "next/image";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getOrderDetailForSeller } from "@/services/orders/order.service";
import { isAppError } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ROUTES } from "@/lib/constants/routes";
import { advanceOrderStatusAction, setDeliveryDetailsAction } from "./actions";
import { getAllowedNextStatuses } from "@/services/orders/order-state-machine";

const NEXT_STATUS_LABELS: Record<string, string> = {
  PROCESSING: "Start processing",
  READY_FOR_PICKUP: "Mark ready for pickup",
  IN_TRANSIT: "Mark in transit",
  DELIVERED: "Mark delivered",
};

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(Role.SELLER);
  const { id } = await params;

  let order;
  try {
    order = await getOrderDetailForSeller(id, session.userId);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const myItems = order.items.filter((item) => item.product.seller.userId === session.userId);
  const nextOptions = getAllowedNextStatuses("SELLER", order.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Orders", href: ROUTES.seller.orders }, { label: `#${order.id.slice(-8)}` }]}
        title={`Order #${order.id.slice(-8)}`}
        description={`${order.buyer.firstName} ${order.buyer.lastName}`}
        actions={<Badge tone={STATUS_TONE[order.status]}>{order.status.replaceAll("_", " ")}</Badge>}
      />

      {nextOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Update fulfillment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {nextOptions.map((status) => (
              <form key={status} action={advanceOrderStatusAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="nextStatus" value={status} />
                <Button type="submit" variant="accent" size="sm">
                  {NEXT_STATUS_LABELS[status] ?? status.replaceAll("_", " ")}
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      )}

      {(order.status === "PAID" || order.status === "PROCESSING") && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery details</CardTitle>
            <CardDescription>Set how this order will reach the buyer before moving it forward.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={setDeliveryDetailsAction} className="flex flex-col gap-4">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="method" className="text-sm font-medium text-foreground">
                  Method
                </label>
                <select
                  id="method"
                  name="method"
                  defaultValue={order.delivery?.method ?? "MANUAL"}
                  className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
                >
                  <option value="MANUAL">Manual (buyer picks up / hand delivery)</option>
                  <option value="PARTNER">Delivery partner</option>
                </select>
              </div>
              <Input
                name="pickupLocation"
                label="Pickup location"
                placeholder="Shop 12, Balogun Market, Lagos"
                defaultValue={order.delivery?.pickupLocation ?? ""}
              />
              <Input
                name="deliveryFee"
                type="number"
                step="0.01"
                min="0"
                label="Delivery fee (optional)"
                defaultValue={order.delivery?.deliveryFee ? Number(order.delivery.deliveryFee) : ""}
              />
              <Input
                name="courier"
                label="Courier (required for delivery partner)"
                placeholder="GIG Logistics"
                defaultValue={order.delivery?.courier ?? ""}
              />
              <Input
                name="trackingCode"
                label="Tracking code (required for delivery partner)"
                placeholder="GIG-123456"
                defaultValue={order.delivery?.trackingCode ?? ""}
              />
              <Input
                name="estimatedAt"
                type="date"
                label="Estimated delivery date (optional)"
                defaultValue={order.delivery?.estimatedAt ? order.delivery.estimatedAt.toISOString().slice(0, 10) : ""}
              />
              <Button type="submit" variant="secondary" className="self-start">
                Save delivery details
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your items in this order</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {myItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.product.images[0] && (
                  <Image src={item.product.images[0].url} alt={item.product.title} fill className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-secondary-foreground">{item.product.title}</p>
                <p className="text-sm text-muted-foreground">Qty {item.quantity}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {order.delivery && order.delivery.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery tracking</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
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
