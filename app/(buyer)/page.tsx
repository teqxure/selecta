import { currentUser } from "@/lib/auth/current-user";
import {
  listActiveProducts,
  listPremiumFinds,
  listUnderBudget,
  listTrending,
  listNearby,
} from "@/services/products/product.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { APP_NAME } from "@/lib/constants/app";

const BUDGET_CEILING = 10_000;

export default async function MarketplaceHomePage() {
  const user = await currentUser();

  const [freshFinds, recentlyAdded, premiumFinds, underBudget, trending, nearby] = await Promise.all([
    listActiveProducts(1, 8),
    listActiveProducts(2, 8),
    listPremiumFinds(8),
    listUnderBudget(BUDGET_CEILING, 8),
    listTrending(8),
    user?.city ? listNearby(user.city, 8) : Promise.resolve([]),
  ]);

  const allIds = [
    ...freshFinds.items,
    ...recentlyAdded.items,
    ...premiumFinds,
    ...underBudget,
    ...trending,
    ...nearby,
  ].map((product) => product.id);
  const savedIds = user ? await getSavedProductIds(user.id, allIds) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 pb-16 pt-12 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Discover fashion, the {APP_NAME} way.
      </h1>
      <p className="mx-auto max-w-xl text-lg text-muted-foreground">
        Africa&apos;s bend-down-select culture, reimagined as a premium digital marketplace.
      </p>

      <div className="mt-8 flex flex-col gap-10 text-left">
        <ProductSection title="Fresh Finds" subtitle="Newly listed, just for you">
          <ProductGrid products={freshFinds.items} savedIds={savedIds} />
        </ProductSection>

        {nearby.length > 0 && (
          <ProductSection title="Near You" subtitle={`Sellers around ${user?.city}`}>
            <ProductGrid products={nearby} savedIds={savedIds} />
          </ProductSection>
        )}

        <ProductSection title="Premium Finds" subtitle="Selecta Gold — almost new, premium pieces">
          <ProductGrid products={premiumFinds} savedIds={savedIds} />
        </ProductSection>

        <ProductSection title="Under ₦10,000" subtitle="Great style, small budget">
          <ProductGrid products={underBudget} savedIds={savedIds} />
        </ProductSection>

        <ProductSection title="Trending" subtitle="What everyone's looking at">
          <ProductGrid products={trending} savedIds={savedIds} />
        </ProductSection>

        <ProductSection title="Recently Added" subtitle="More new arrivals">
          <ProductGrid products={recentlyAdded.items} savedIds={savedIds} />
        </ProductSection>
      </div>
    </div>
  );
}
