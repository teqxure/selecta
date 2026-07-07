import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listCustomersForSeller } from "@/services/orders/order.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SellerCustomersPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const customers = await listCustomersForSeller(profile.id);

  const repeatCount = customers.filter((c) => c.orderCount > 1).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length === 1 ? "" : "s"} · {repeatCount} repeat
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet."
          description="Once someone buys from your store, they'll show up here."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Total spent</th>
                  <th className="px-4 py-3 font-medium">Last order</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(({ buyer, orderCount, totalSpent, lastOrderAt }) => (
                  <tr key={buyer.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-secondary-foreground">
                      {buyer.firstName} {buyer.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{orderCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lastOrderAt.toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {orderCount > 1 && <Badge tone="accent">Repeat</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
