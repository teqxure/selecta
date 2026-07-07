import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listSellers } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";

export default async function AdminSellersPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const { items: sellers, totalCount } = await listSellers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Sellers ({totalCount})</h1>

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
                    <Link href={ROUTES.admin.seller(seller.id)} className="hover:underline">
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
    </div>
  );
}
