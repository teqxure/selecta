import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { DEFAULT_CURRENCY } from "@/lib/constants/app";

export default async function AdminOrdersPage() {
  await requirePermission("orders.manage");

  const orders = await db.order.findMany({
    include: { buyer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const format = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Orders</h1>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No orders yet.</CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={ROUTES.admin.order(order.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-secondary-foreground">Order #{order.id.slice(-8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.buyer.firstName} {order.buyer.lastName} · {order.items.length} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-secondary-foreground">
                      {format(Number(order.totalAmount), order.currency || DEFAULT_CURRENCY)}
                    </p>
                    <Badge tone={STATUS_TONE[order.status]}>{order.status.replaceAll("_", " ")}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
