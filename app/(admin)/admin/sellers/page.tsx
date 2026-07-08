import Link from "next/link";
import { Store } from "lucide-react";
import { requirePermission } from "@/lib/auth/rbac";
import { listSellers } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AdminSellersPage() {
  await requirePermission("vendors.manage");
  const { items: sellers, totalCount } = await listSellers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Sellers" }]} title={`Sellers (${totalCount})`} />

      {sellers.length === 0 ? (
        <EmptyState icon={Store} title="No sellers yet" description="When sellers join Selecta, they'll appear here." />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Sales</th>
                  <th className="px-4 py-3 font-medium">Verification</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller) => (
                  <tr key={seller.id} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className="px-4 py-3 text-secondary-foreground">
                      <Link href={ROUTES.admin.seller(seller.id)} className="flex items-center gap-2.5 hover:underline">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                          {(seller.storeName ?? seller.businessName).charAt(0).toUpperCase()}
                        </span>
                        {seller.storeName ?? seller.businessName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {seller.user.firstName} {seller.user.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {seller.city ? `${seller.city}, ${seller.state}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{seller.totalSales}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[seller.verificationStatus]}>{seller.verificationStatus}</Badge>
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
