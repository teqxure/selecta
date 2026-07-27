import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderDeliveryHistory } from "@/services/logistics/rider.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PackageCheck } from "lucide-react";

const STATUS_TONE: Record<string, "success" | "danger" | "neutral"> = {
  DELIVERED: "success",
  COMPLETED: "success",
  FAILED: "danger",
};

export default async function RiderHistoryPage() {
  const session = await requireRole(Role.RIDER);
  const deliveries = await getRiderDeliveryHistory(session.userId, 50);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Delivery history" description="Your completed and failed deliveries." />

      <div className="flex flex-col gap-3">
        {deliveries.length === 0 && (
          <EmptyState icon={PackageCheck} title="No delivery history yet" description="Completed deliveries will show up here." />
        )}
        {deliveries.map((delivery) => {
          const address = delivery.order.shippingAddress as { line1?: string; city?: string };
          return (
            <Card key={delivery.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Order #{delivery.orderId.slice(-8)}</span>
                    <Badge tone={STATUS_TONE[delivery.status] ?? "neutral"}>{delivery.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {address?.line1}, {address?.city}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {delivery.deliveredAt
                      ? delivery.deliveredAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
                      : delivery.updatedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
