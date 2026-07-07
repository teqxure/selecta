import Link from "next/link";
import Image from "next/image";
import { requirePermission } from "@/lib/auth/rbac";
import { listProductsForAdmin } from "@/services/products/product.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { approveProductAction, rejectProductAction, removeProductAction, toggleFeaturedAction } from "./actions";

const STATUS_TABS = ["PENDING_REVIEW", "ACTIVE", "REJECTED", "REMOVED", "SOLD"] as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("products.moderate");
  const { status } = await searchParams;
  const activeStatus = status && STATUS_TABS.includes(status as (typeof STATUS_TABS)[number]) ? status : "PENDING_REVIEW";
  const { items: products, totalCount } = await listProductsForAdmin(activeStatus);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Products ({totalCount})</h1>

      <nav className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`${ROUTES.admin.products}?status=${tab}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              activeStatus === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {tab.replace("_", " ")}
          </Link>
        ))}
      </nav>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No products with this status.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.images[0] && (
                    <Image src={product.images[0].url} alt={product.title} fill className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-secondary-foreground">{product.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {product.seller.user.firstName} {product.seller.user.lastName} ({product.seller.storeName ?? product.seller.businessName})
                  </p>
                </div>
                <Badge tone={STATUS_TONE[product.status]}>{product.status.replace("_", " ")}</Badge>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {product.status === "PENDING_REVIEW" && (
                    <>
                      <form action={approveProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <Button type="submit" size="sm" variant="accent">
                          Approve
                        </Button>
                      </form>
                      <form action={rejectProductAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="productId" value={product.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Reason"
                          className="h-9 w-32 rounded-lg border border-border bg-background px-2 text-xs"
                        />
                        <Button type="submit" size="sm" variant="outline">
                          Reject
                        </Button>
                      </form>
                    </>
                  )}
                  {product.status === "ACTIVE" && (
                    <>
                      <form action={toggleFeaturedAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="featured" value={String(product.isFeatured)} />
                        <Button type="submit" size="sm" variant={product.isFeatured ? "secondary" : "ghost"}>
                          {product.isFeatured ? "Unfeature" : "Feature"}
                        </Button>
                      </form>
                      <form action={removeProductAction}>
                        <input type="hidden" name="productId" value={product.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Remove
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
