import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getCollection } from "@/services/marketing/collection.service";
import { searchActiveProducts } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LayoutGrid } from "lucide-react";
import { addProductToCollectionAction, removeProductFromCollectionAction } from "../actions";

interface AdminCollectionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminCollectionDetailPage({ params, searchParams }: AdminCollectionDetailPageProps) {
  await requirePermission("CREATE_PROMOTIONS");
  const { id } = await params;
  const { q } = await searchParams;

  const collection = await getCollection(id);
  if (!collection) notFound();

  const searchResults = q?.trim() ? await searchActiveProducts(q.trim(), 10) : [];
  const existingProductIds = new Set(collection.products.map((p) => p.productId));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.admin.root },
          { label: "Collections", href: ROUTES.admin.marketplaceCollections },
          { label: collection.name },
        ]}
        title={collection.name}
        description={`/${collection.slug}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Products in this collection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {collection.products.length === 0 && (
            <EmptyState icon={LayoutGrid} title="No products yet" description="Search below to add some." />
          )}
          {collection.products.map(({ product }) => (
            <div key={product.id} className="flex items-center justify-between rounded-xl border border-border p-3">
              <span className="text-sm text-foreground">{product.title}</span>
              <form action={removeProductFromCollectionAction}>
                <input type="hidden" name="collectionId" value={collection.id} />
                <input type="hidden" name="productId" value={product.id} />
                <Button type="submit" size="sm" variant="outline">
                  Remove
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add products</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={ROUTES.admin.collection(collection.id)} className="flex items-end gap-3">
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
              {existingProductIds.has(product.id) ? (
                <span className="text-xs text-muted-foreground">Already in collection</span>
              ) : (
                <form action={addProductToCollectionAction}>
                  <input type="hidden" name="collectionId" value={collection.id} />
                  <input type="hidden" name="productId" value={product.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    Add
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
