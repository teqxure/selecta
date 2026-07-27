import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderDeliveryById } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProofOfDeliveryForm } from "@/components/rider/ProofOfDeliveryForm";
import { advanceDeliveryStatusAction } from "../../actions";
import type { DeliveryStatus } from "@/generated/prisma/enums";

const NEXT_STATUS: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string }>> = {
  RIDER_ASSIGNED: { next: "PICKED_UP", label: "Mark picked up" },
  PICKED_UP: { next: "ON_THE_WAY", label: "Mark on the way" },
  ON_THE_WAY: { next: "NEARBY", label: "Mark nearby" },
};

export default async function RiderDeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(Role.RIDER);
  const { id } = await params;
  const delivery = await getRiderDeliveryById(session.userId, id);
  const address = delivery.order.shippingAddress as {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    landmark?: string;
    notes?: string;
  };

  const nextAction = NEXT_STATUS[delivery.status];
  const readyForProof = ["PICKED_UP", "ON_THE_WAY", "NEARBY"].includes(delivery.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Deliveries", href: ROUTES.rider.dashboard }, { label: `#${delivery.orderId.slice(-8)}` }]}
        title={`Order #${delivery.orderId.slice(-8)}`}
        description={`Buyer: ${delivery.order.buyer.firstName} ${delivery.order.buyer.lastName}`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Status</CardTitle>
            <Badge tone="neutral">{delivery.status.replaceAll("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            <p className="text-foreground">{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
            <p>{address.city}, {address.state}</p>
            {address.landmark && <p>Landmark: {address.landmark}</p>}
            {address.notes && <p>Notes: {address.notes}</p>}
          </div>

          {nextAction && (
            <form action={advanceDeliveryStatusAction}>
              <input type="hidden" name="deliveryId" value={delivery.id} />
              <input type="hidden" name="nextStatus" value={nextAction.next} />
              <Button type="submit" variant="secondary" size="sm">
                {nextAction.label}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {delivery.order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.product.title} × {item.quantity}
              </span>
              <span className="text-muted-foreground">{item.product.seller.storeName ?? item.product.seller.businessName}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {readyForProof && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm delivery</CardTitle>
          </CardHeader>
          <CardContent>
            <ProofOfDeliveryForm deliveryId={delivery.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
