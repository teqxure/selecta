import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listSavedProducts } from "@/services/products/saved-product.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { ProductGrid } from "@/components/marketplace/ProductGrid";

export default async function SavedProductsPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const saved = await listSavedProducts(user.id);
  const products = saved.map((entry) => entry.product);
  const savedIds = new Set(products.map((product) => product.id));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold text-foreground">Saved products</h1>

      {products.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Tap the heart on any product to save it here.
          </CardContent>
        </Card>
      ) : (
        <ProductGrid products={products} savedIds={savedIds} />
      )}
    </div>
  );
}
