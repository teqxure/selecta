import { redirect } from "next/navigation";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listOrdersForBuyer } from "@/services/orders/order.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function BuyerOrdersPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const orders = await listOrdersForBuyer(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Your orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No orders yet"
          description="When you check out, your orders and their delivery status will show up here."
          action={{ label: "Continue shopping", href: ROUTES.search }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={ROUTES.order(order.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-secondary-foreground">Order #{order.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">{order.items.length} item(s)</p>
                  </div>
                  <Badge tone={STATUS_TONE[order.status]}>{order.status.replaceAll("_", " ")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
