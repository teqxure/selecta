import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/auth/current-user";
import { listOrdersForBuyer } from "@/services/orders/order.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";

export default async function BuyerOrdersPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const orders = await listOrdersForBuyer(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Your orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            You haven&apos;t placed any orders yet.
          </CardContent>
        </Card>
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
