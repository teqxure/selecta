import { requirePermission } from "@/lib/auth/rbac";
import { listFeaturedProducts, searchActiveProducts } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Star } from "lucide-react";
import { setFeaturedAction } from "./actions";

interface AdminFeaturedPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminFeaturedPage({ searchParams }: AdminFeaturedPageProps) {
  await requirePermission("MANAGE_PRODUCTS");
  const { q } = await searchParams;

  const [featured, searchResults] = await Promise.all([
    listFeaturedProducts(),
    q?.trim() ? searchActiveProducts(q.trim(), 10) : Promise.resolve([]),
  ]);
  const featuredIds = new Set(featured.map((p) => p.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Featured products" }]}
        title="Featured products"
        description="Curated placement — featured listings get a ranking lift in search and discovery."
      />

      <Card>
        <CardHeader>
          <CardTitle>Currently featured</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {featured.length === 0 && <EmptyState icon={Star} title="Nothing featured yet" description="Search below to feature a listing." />}
          {featured.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <span className="text-sm text-foreground">{product.title}</span>
              <form action={setFeaturedAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="featured" value="false" />
                <Button type="submit" size="sm" variant="outline">
                  Unfeature
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feature a product</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={ROUTES.admin.marketplaceFeatured} className="flex items-end gap-3">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search active products by title"
              className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          {searchResults.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <span className="text-sm text-foreground">{product.title}</span>
              {featuredIds.has(product.id) ? (
                <span className="text-xs text-muted-foreground">Already featured</span>
              ) : (
                <form action={setFeaturedAction}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="featured" value="true" />
                  <Button type="submit" size="sm" variant="secondary">
                    Feature
                  </Button>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
