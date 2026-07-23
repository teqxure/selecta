import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import {
  listActiveProducts,
  listPremiumFinds,
  listUnderBudget,
  listTrending,
  listNearby,
  getPopularCategories,
  getTopSellers,
  getRecommendedForYou,
} from "@/services/products/search.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { Hero } from "@/components/marketplace/Hero";
import { ProductSection } from "@/components/marketplace/ProductSection";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { StyleCollections } from "@/components/marketplace/StyleCollections";
import { TrustStrip } from "@/components/marketplace/TrustStrip";
import { ValuePropGrid } from "@/components/marketplace/ValuePropGrid";
import { SellCTABanner } from "@/components/marketplace/SellCTABanner";
import { FAQAccordion } from "@/components/marketplace/FAQAccordion";
import { ROUTES } from "@/lib/constants/routes";
import { CURATED_HERO_IMAGES } from "@/lib/constants/hero-images";

const BUDGET_CEILING = 10_000;

export default async function MarketplaceHomePage() {
  const user = await currentUser();
  const locationLabel = user?.city || "Nigeria";

  const [
    freshFinds,
    premiumFinds,
    underBudget,
    trending,
    nearby,
    recommended,
    popularCategories,
    topSellers,
    activeListingCount,
    verifiedSellerCount,
    topLevelCategoryCount,
    citiesServed,
    completedOrderCount,
    averageSellerRating,
  ] = await Promise.all([
    listActiveProducts(1, 8),
    listPremiumFinds(8),
    listUnderBudget(BUDGET_CEILING, 8),
    listTrending(8),
    user?.city ? listNearby(user.city, 8) : Promise.resolve([]),
    getRecommendedForYou(user?.id, 8),
    getPopularCategories(6),
    getTopSellers(8),
    db.product.count({ where: { status: "ACTIVE" } }),
    db.sellerProfile.count({ where: { verificationStatus: "VERIFIED" } }),
    db.category.count({ where: { isActive: true, parentId: null } }),
    db.sellerProfile
      .findMany({ where: { verificationStatus: "VERIFIED", city: { not: null } }, select: { city: true }, distinct: ["city"] })
      .then((rows) => rows.length),
    db.order.count({ where: { status: "COMPLETED" } }),
    db.sellerProfile
      .aggregate({ where: { verificationStatus: "VERIFIED" }, _avg: { ratingAverage: true } })
      .then((result) => result._avg.ratingAverage ?? 0),
  ]);

  const allIds = [...freshFinds.items, ...premiumFinds, ...underBudget, ...trending, ...nearby, ...recommended].map(
    (p) => p.id,
  );
  const savedIds = user ? await getSavedProductIds(user.id, allIds) : undefined;
  // Real listing photos first, topped up with curated decorative stock so
  // the hero always has enough variety to cycle through even while the
  // catalog is small — the pool only gets more real-photo-heavy as more
  // products get listed.
  const realHeroImages = [...new Set(
    [...freshFinds.items, ...trending, ...premiumFinds]
      .map((p) => p.images[0]?.url)
      .filter((url): url is string => Boolean(url)),
  )].slice(0, 9);
  const floatingImages = [...realHeroImages, ...CURATED_HERO_IMAGES];

  return (
    <div className="flex flex-col">
      <Hero
        activeListingCount={activeListingCount}
        verifiedSellerCount={verifiedSellerCount}
        locationLabel={locationLabel}
        floatingImages={floatingImages}
      />

      <TrustStrip
        categoryCount={topLevelCategoryCount}
        cityCount={citiesServed}
        // TEMPORARY (per explicit request 2026-07-23): the real completedOrderCount/averageSellerRating
        // are too low to show yet. Hardcoded here at the call site — not in the query or the
        // component — so reverting to the real numbers is just restoring the two lines below.
        completedOrderCount={50}
        averageSellerRating={5}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 pt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style Collections</p>
        <StyleCollections />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        {popularCategories.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Popular categories</h2>
            <div className="flex flex-wrap gap-3">
              {popularCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`${ROUTES.search}?categoryId=${category.id}`}
                  className="flex max-w-[calc(100vw-3rem)] items-center gap-3 rounded-2xl border border-border bg-secondary px-4 py-3 transition-colors hover:border-accent/50"
                >
                  {category.imageUrl && (
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      <Image src={category.imageUrl} alt={category.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{category.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{category.productCount} listings</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {user && recommended.length > 0 && (
          <ProductSection title="Recommended for you" subtitle="Based on what you've browsed" seeAllHref={ROUTES.search}>
            <ProductGrid products={recommended} savedIds={savedIds} />
          </ProductSection>
        )}

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
          subtitle="Selecta Premium — almost new pieces"
          seeAllHref={`${ROUTES.search}?conditionGrade=SELECTA_GOLD`}
        >
          <ProductGrid products={premiumFinds} savedIds={savedIds} />
        </ProductSection>

        <ProductSection title="Trending Now" subtitle="What everyone's looking at" seeAllHref={`${ROUTES.search}?sort=trending`}>
          <ProductGrid products={trending} savedIds={savedIds} />
        </ProductSection>

        <ProductSection
          title="Under ₦10,000"
          subtitle="Great style, small budget"
          seeAllHref={`${ROUTES.search}?maxPrice=${BUDGET_CEILING}`}
        >
          <ProductGrid products={underBudget} savedIds={savedIds} />
        </ProductSection>

        <ValuePropGrid />

        {topSellers.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Top sellers</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {topSellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={seller.storeSlug ? ROUTES.store(seller.storeSlug) : ROUTES.search}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-3 transition-colors hover:border-accent/50"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-xl bg-muted">
                    {seller.coverImageUrl && (
                      <Image src={seller.coverImageUrl} alt={seller.storeName ?? seller.businessName} fill className="object-cover" />
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{seller.storeName ?? seller.businessName}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-current text-accent" strokeWidth={0} />
                    {seller.ratingAverage.toFixed(1)} · {seller.totalSales} sold
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <SellCTABanner />

        <FAQAccordion />
      </div>
    </div>
  );
}
