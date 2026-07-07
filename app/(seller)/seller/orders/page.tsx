import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listOrdersForSeller } from "@/services/orders/order.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function SellerOrdersPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const orders = await listOrdersForSeller(profile.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No orders yet — they&apos;ll show up here as soon as a buyer checks out.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-secondary-foreground">Order #{order.id.slice(-8)}</p>
                  <p className="text-sm text-muted-foreground">{order.items.length} item(s)</p>
                </div>
                <Badge tone={order.status === "DELIVERED" ? "success" : "neutral"}>{order.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
