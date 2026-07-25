import Link from "next/link";
import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
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
  getCollectionPreviewImage,
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
import { STYLE_COLLECTIONS } from "@/lib/constants/style-collections";

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
    collectionPreviewImages,
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
    Promise.all(STYLE_COLLECTIONS.map((collection) => getCollectionPreviewImage(collection.query))),
  ]);

  const styleCollectionImages = Object.fromEntries(
    STYLE_COLLECTIONS.map((collection, i) => [
      collection.query,
      collectionPreviewImages[i] ?? CURATED_HERO_IMAGES[i % CURATED_HERO_IMAGES.length],
    ]),
  );

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
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Style collections</p>
        <StyleCollections images={styleCollectionImages} />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        {popularCategories.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Browse</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Popular categories</h2>
            <div className="no-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6 pb-1">
              {popularCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`${ROUTES.search}?categoryId=${category.id}`}
                  className="group relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] sm:w-44"
                >
                  {category.imageUrl && (
                    <Image
                      src={category.imageUrl}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 144px, 176px"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/70 via-midnight/5 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="truncate font-display text-sm font-semibold text-white">{category.name}</p>
                    <p className="truncate text-xs text-white/70">{category.productCount} listings</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {user && recommended.length > 0 && (
          <ProductSection
            eyebrow="For you"
            title="Recommended for you"
            subtitle="Based on what you've browsed"
            seeAllHref={ROUTES.search}
          >
            <ProductGrid products={recommended} savedIds={savedIds} />
          </ProductSection>
        )}

        <ProductSection eyebrow="Just landed" title="Fresh Finds" subtitle="Newly listed, just for you" seeAllHref={ROUTES.search}>
          <ProductGrid products={freshFinds.items} savedIds={savedIds} />
        </ProductSection>

        {nearby.length > 0 && (
          <ProductSection
            eyebrow="Nearby"
            title="Near You"
            subtitle={`Sellers around ${locationLabel}`}
            seeAllHref={`${ROUTES.search}?city=${encodeURIComponent(locationLabel)}`}
          >
            <ProductGrid products={nearby} savedIds={savedIds} />
          </ProductSection>
        )}
      </div>

      <div className="bg-secondary/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
          <ProductSection
            eyebrow="Curated"
            title="Premium Finds"
            subtitle="Selecta Premium — almost new pieces"
            seeAllHref={`${ROUTES.search}?conditionGrade=SELECTA_GOLD`}
          >
            <ProductGrid products={premiumFinds} savedIds={savedIds} />
          </ProductSection>

          <ProductSection
            eyebrow="Right now"
            title="Trending Now"
            subtitle="What everyone's looking at"
            seeAllHref={`${ROUTES.search}?sort=trending`}
          >
            <ProductGrid products={trending} savedIds={savedIds} />
          </ProductSection>

          <ProductSection
            eyebrow="Budget picks"
            title="Under ₦10,000"
            subtitle="Great style, small budget"
            seeAllHref={`${ROUTES.search}?maxPrice=${BUDGET_CEILING}`}
          >
            <ProductGrid products={underBudget} savedIds={savedIds} />
          </ProductSection>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <ValuePropGrid />
      </div>

      {topSellers.length > 0 && (
        <div className="bg-secondary/40">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Trusted stores</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Top sellers</h2>
            <div className="no-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6 pb-1">
              {topSellers.map((seller) => (
                <Link
                  key={seller.id}
                  href={seller.storeSlug ? ROUTES.store(seller.storeSlug) : ROUTES.search}
                  className="group w-52 shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] sm:w-60"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    {seller.coverImageUrl && (
                      <Image
                        src={seller.coverImageUrl}
                        alt={seller.storeName ?? seller.businessName}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        sizes="(max-width: 640px) 208px, 240px"
                      />
                    )}
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-medium text-background shadow-sm">
                      <BadgeCheck className="h-3 w-3" strokeWidth={2} />
                      Verified
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-foreground">{seller.storeName ?? seller.businessName}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-current text-gold" strokeWidth={0} />
                      {seller.ratingAverage.toFixed(1)} · {seller.totalSales} sold
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <SellCTABanner />

        <FAQAccordion />
      </div>
    </div>
  );
}
