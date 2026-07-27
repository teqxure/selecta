import { requirePermission } from "@/lib/auth/rbac";
import { listUnassignedDeliveries, listAssignedDeliveries } from "@/services/logistics/dispatch.service";
import { listAvailableRiders } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Navigation } from "lucide-react";
import { AssignRiderForm } from "./assign-rider-form";
import { unassignRiderAction } from "./actions";

export default async function AdminDispatchPage() {
  await requirePermission("ASSIGN_RIDERS");
  const [unassigned, assigned, availableRiders] = await Promise.all([
    listUnassignedDeliveries(),
    listAssignedDeliveries(),
    listAvailableRiders(),
  ]);

  const riderOptions = availableRiders.map((r) => ({ userId: r.userId, name: `${r.user.firstName} ${r.user.lastName}` }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Dispatch" }]}
        title="Dispatch Center"
        description="Assign in-house riders to deliveries and monitor active assignments."
      />

      <Card>
        <CardHeader>
          <CardTitle>Awaiting assignment ({unassigned.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {unassigned.length === 0 && (
            <EmptyState icon={Navigation} title="Nothing to dispatch" description="Every active delivery has a rider assigned." />
          )}
          {unassigned.map((delivery) => {
            const address = delivery.order.shippingAddress as { line1?: string; city?: string };
            return (
              <div key={delivery.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">Order #{delivery.orderId.slice(-8)}</span>
                    <Badge tone="neutral">{delivery.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {delivery.order.buyer.firstName} {delivery.order.buyer.lastName} · {address?.line1}, {address?.city}
                  </p>
                </div>
                {riderOptions.length > 0 ? (
                  <AssignRiderForm deliveryId={delivery.id} riders={riderOptions} />
                ) : (
                  <span className="text-xs text-muted-foreground">No riders available</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned & in progress ({assigned.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {assigned.length === 0 && <EmptyState icon={Navigation} title="Nothing in progress" description="No deliveries currently assigned." />}
          {assigned.map((delivery) => (
            <div key={delivery.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Order #{delivery.orderId.slice(-8)}</span>
                  <Badge tone="neutral">{delivery.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Rider: {delivery.agent ? `${delivery.agent.firstName} ${delivery.agent.lastName}` : "—"}
                </p>
              </div>
              <form action={unassignRiderAction}>
                <input type="hidden" name="deliveryId" value={delivery.id} />
                <Button type="submit" size="sm" variant="outline">
                  Unassign
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
