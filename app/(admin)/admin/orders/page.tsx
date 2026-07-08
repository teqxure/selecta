import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
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
      <PageHeader breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Orders" }]} title={`Orders (${orders.length})`} />

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" description="When buyers check out, their orders will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={ROUTES.admin.order(order.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                      {order.buyer.firstName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="font-medium text-secondary-foreground">Order #{order.id.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.buyer.firstName} {order.buyer.lastName} · {order.items.length} item(s)
                      </p>
                    </div>
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
