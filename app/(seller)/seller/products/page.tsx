import Link from "next/link";
import Image from "next/image";
import { PackagePlus, Search } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listProductsBySeller, getProductStatusCounts } from "@/services/products/product.service";
import { getProductQualityScoresForSeller } from "@/services/insights/product-insight.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { pauseProductAction, resumeProductAction, deleteProductAction, duplicateProductAction } from "./actions";

const STATUS_TABS = [
  { label: "All", value: undefined },
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING_REVIEW" },
  { label: "Sold", value: "SOLD" },
  { label: "Rejected", value: "REJECTED" },
] as const;

export default async function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireRole(Role.SELLER);
  const { q, status } = await searchParams;
  const activeStatus = STATUS_TABS.find((tab) => tab.value === status)?.value;

  const profile = await getSellerProfileByUserId(session.userId);
  const [products, counts, qualityScores] = await Promise.all([
    listProductsBySeller(profile.id, { q, status: activeStatus }),
    getProductStatusCounts(profile.id),
    getProductQualityScoresForSeller(profile.id),
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.label}
              href={tab.value ? `${ROUTES.seller.products}?status=${tab.value}` : ROUTES.seller.products}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                activeStatus === tab.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <form action={ROUTES.seller.products} method="GET" className="flex items-center gap-2">
          {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
          <Input name="q" defaultValue={q ?? ""} placeholder="Search your inventory…" className="w-56" />
          <Button type="submit" size="md" variant="secondary" aria-label="Search">
            <Search className="h-4 w-4" strokeWidth={2} />
          </Button>
        </form>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title={q || activeStatus ? "Nothing matches that filter." : "Your rail is empty."}
          description={
            q || activeStatus
              ? "Try a different search term or status."
              : "List your first piece and start reaching Selecta buyers today."
          }
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
                  {qualityScores.get(product.id)?.suggestions[0] && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">💡 {qualityScores.get(product.id)!.suggestions[0]}</p>
                  )}
                </div>
                {qualityScores.has(product.id) && (
                  <Badge tone={qualityScores.get(product.id)!.score >= 70 ? "success" : qualityScores.get(product.id)!.score >= 50 ? "warning" : "danger"}>
                    Quality {qualityScores.get(product.id)!.score}
                  </Badge>
                )}
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
