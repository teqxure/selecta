import Link from "next/link";
import Image from "next/image";
import { PackagePlus } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listProductsBySeller, getProductStatusCounts } from "@/services/products/product.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { ROUTES } from "@/lib/constants/routes";
import { pauseProductAction, resumeProductAction, deleteProductAction, duplicateProductAction } from "./actions";

export default async function SellerProductsPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const [products, counts] = await Promise.all([
    listProductsBySeller(profile.id),
    getProductStatusCounts(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">Products</h1>
        <Link href={ROUTES.seller.newProduct}>
          <Button variant="accent" size="sm">
            + New listing
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={String(counts.total)} />
        <StatCard label="Active" value={String(counts.active)} />
        <StatCard label="Pending" value={String(counts.pending)} />
        <StatCard label="Sold" value={String(counts.sold)} />
        <StatCard label="Rejected" value={String(counts.rejected)} />
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Your rail is empty."
          description="List your first piece and start reaching Selecta buyers today."
          action={{ label: "Create a listing", href: ROUTES.seller.newProduct }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
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
                    {new Intl.NumberFormat("en-NG", { style: "currency", currency: product.currency }).format(
                      Number(product.discountPrice ?? product.price),
                    )}
                    {" · "}
                    {product.viewCount} views · {product.likeCount} likes
                  </p>
                  {product.status === "REJECTED" && product.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600">Rejected: {product.rejectionReason}</p>
                  )}
                </div>
                <Badge tone={STATUS_TONE[product.status]}>{product.status.replace("_", " ")}</Badge>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {product.status === "DRAFT" && (
                    <Link href={ROUTES.seller.productImages(product.id)}>
                      <Button size="sm" variant="secondary">
                        Continue
                      </Button>
                    </Link>
                  )}
                  {(product.status === "ACTIVE" || product.status === "PENDING_REVIEW" || product.status === "PAUSED" || product.status === "REJECTED") && (
                    <Link href={ROUTES.seller.productDetails(product.id)}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                  )}
                  {product.status === "ACTIVE" && (
                    <form action={pauseProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Pause
                      </Button>
                    </form>
                  )}
                  {product.status === "PAUSED" && (
                    <form action={resumeProductAction}>
                      <input type="hidden" name="productId" value={product.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Resume
                      </Button>
                    </form>
                  )}
                  <form action={duplicateProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Duplicate
                    </Button>
                  </form>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Delete
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
