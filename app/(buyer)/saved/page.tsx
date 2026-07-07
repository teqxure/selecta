import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listSavedProducts } from "@/services/products/saved-product.service";
import { ROUTES } from "@/lib/constants/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductGrid } from "@/components/marketplace/ProductGrid";

export default async function SavedProductsPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const saved = await listSavedProducts(user.id);
  const products = saved.map((entry) => entry.product);
  const savedIds = new Set(products.map((product) => product.id));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Your collection</h1>

      {products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Your collection is waiting."
          description="Tap the heart on anything you love and it'll show up here."
          action={{ label: "Start exploring", href: ROUTES.search }}
        />
      ) : (
        <ProductGrid products={products} savedIds={savedIds} />
      )}
    </div>
  );
}
