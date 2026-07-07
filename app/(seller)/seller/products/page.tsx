import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listProductsBySeller } from "@/services/products/product.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function SellerProductsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const products = await listProductsBySeller(profile.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Products</h1>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            You haven&apos;t listed any products yet. Product creation is coming in the next phase.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-secondary-foreground">{product.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(
                      Number(product.price),
                    )}
                  </p>
                </div>
                <Badge tone={product.status === "ACTIVE" ? "success" : "neutral"}>{product.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
