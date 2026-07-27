import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { listCollections } from "@/services/marketing/collection.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LayoutGrid } from "lucide-react";
import { setCollectionActiveAction } from "./actions";
import { CreateCollectionForm } from "./create-collection-form";

export default async function AdminCollectionsPage() {
  await requirePermission("CREATE_PROMOTIONS");
  const collections = await listCollections();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Collections" }]}
        title="Collections"
        description="Curated, admin-ordered product groupings — separate from category taxonomy."
      />

      <Card>
        <CardHeader>
          <CardTitle>All collections</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {collections.length === 0 && <EmptyState icon={LayoutGrid} title="No collections yet" description="Create one below." />}
          {collections.map((collection) => (
            <div key={collection.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link href={ROUTES.admin.collection(collection.id)} className="font-medium text-foreground hover:underline">
                    {collection.name}
                  </Link>
                  <Badge tone={collection.isActive ? "success" : "neutral"}>{collection.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  /{collection.slug} · {collection._count.products} product{collection._count.products === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={ROUTES.admin.collection(collection.id)}>
                  <Button size="sm" variant="outline">
                    Manage products
                  </Button>
                </Link>
                <form action={setCollectionActiveAction}>
                  <input type="hidden" name="id" value={collection.id} />
                  <input type="hidden" name="isActive" value={String(!collection.isActive)} />
                  <Button type="submit" size="sm" variant={collection.isActive ? "outline" : "secondary"}>
                    {collection.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New collection</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCollectionForm />
        </CardContent>
      </Card>
    </div>
  );
}
