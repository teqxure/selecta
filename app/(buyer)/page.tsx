import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import {
  listActiveProducts,
  listPremiumFinds,
  listUnderBudget,
  listTrending,
  listNearby,
} from "@/services/products/product.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { Hero } from "@/components/marketplace/Hero";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { StyleCollections } from "@/components/marketplace/StyleCollections";
import { ROUTES } from "@/lib/constants/routes";

const BUDGET_CEILING = 10_000;

export default async function MarketplaceHomePage() {
  const user = await currentUser();
  const locationLabel = user?.city || "Nigeria";

  const [freshFinds, premiumFinds, underBudget, trending, nearby, activeListingCount, verifiedSellerCount] =
    await Promise.all([
      listActiveProducts(1, 8),
      listPremiumFinds(8),
      listUnderBudget(BUDGET_CEILING, 8),
      listTrending(8),
      user?.city ? listNearby(user.city, 8) : Promise.resolve([]),
      db.product.count({ where: { status: "ACTIVE" } }),
      db.sellerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    ]);

  const allIds = [...freshFinds.items, ...premiumFinds, ...underBudget, ...trending, ...nearby].map((p) => p.id);
  const savedIds = user ? await getSavedProductIds(user.id, allIds) : undefined;
  const floatingImages = freshFinds.items
    .map((p) => p.images[0]?.url)
    .filter((url): url is string => Boolean(url))
    .slice(0, 3);

  return (
    <div className="flex flex-col">
      <Hero
        activeListingCount={activeListingCount}
        verifiedSellerCount={verifiedSellerCount}
        locationLabel={locationLabel}
        floatingImages={floatingImages}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 pt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style Collections</p>
        <StyleCollections />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <ProductSection title="Fresh Finds" subtitle="Newly listed, just for you" seeAllHref={ROUTES.search}>
          <ProductGrid products={freshFinds.items} savedIds={savedIds} />
        </ProductSection>

        {nearby.length > 0 && (
          <ProductSection
            title="Near You"
            subtitle={`Sellers around ${locationLabel}`}
            seeAllHref={`${ROUTES.search}?city=${encodeURIComponent(locationLabel)}`}
          >
            <ProductGrid products={nearby} savedIds={savedIds} />
          </ProductSection>
        )}

        <ProductSection
          title="Premium Finds"
          subtitle="Selecta Gold — almost new, premium pieces"
          seeAllHref={`${ROUTES.search}?conditionGrade=SELECTA_GOLD`}
        >
          <ProductGrid products={premiumFinds} savedIds={savedIds} />
        </ProductSection>

        <ProductSection
          title="Trending Now"
          subtitle="What everyone's looking at"
          seeAllHref={ROUTES.search}
        >
          <ProductGrid products={trending} savedIds={savedIds} />
        </ProductSection>

        <ProductSection
          title="Under ₦10,000"
          subtitle="Great style, small budget"
          seeAllHref={`${ROUTES.search}?maxPrice=${BUDGET_CEILING}`}
        >
          <ProductGrid products={underBudget} savedIds={savedIds} />
        </ProductSection>
      </div>
    </div>
  );
}
