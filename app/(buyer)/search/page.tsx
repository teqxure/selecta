import { currentUser } from "@/lib/auth/current-user";
import { searchProducts, getRecentSearches, getPopularSearchTerms } from "@/services/products/search.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { searchFiltersSchema } from "@/lib/validators/product";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { SearchBar } from "./search-bar";
import { SortSelect } from "./sort-select";
import { FilterBar } from "./filter-bar";
import { ROUTES } from "@/lib/constants/routes";

const pillClassName =
  "h-10 rounded-full border border-border bg-background px-4 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background appearance-none cursor-pointer";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const rawParams = await searchParams;
  const parsed = searchFiltersSchema.safeParse(rawParams);
  const filters = parsed.success ? parsed.data : { page: 1, sort: "relevance" as const };

  const [user, { ipAddress }] = await Promise.all([currentUser(), getRequestMeta()]);

  const [{ items: products, totalCount }, categories, recentSearches, popularSearches] = await Promise.all([
    searchProducts(filters, undefined, { userId: user?.id, ipAddress }),
    listActiveCategoryTree(),
    user ? getRecentSearches(user.id) : Promise.resolve([]),
    getPopularSearchTerms(6),
  ]);
  const savedIds = user ? await getSavedProductIds(user.id, products.map((p) => p.id)) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-foreground">Explore</h1>

      <div className="flex flex-col gap-3">
        <SearchBar initialQuery={rawParams.q ?? ""} recentSearches={recentSearches} popularSearches={popularSearches.map((p) => p.query)} />
        <FilterBar categories={categories} rawParams={rawParams} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {totalCount} result{totalCount === 1 ? "" : "s"}
          </p>
          <form action={ROUTES.search} method="GET">
            {Object.entries(rawParams)
              .filter(([key]) => key !== "sort" && key !== "page")
              .map(([key, value]) => (value ? <input key={key} type="hidden" name={key} value={value} /> : null))}
            <SortSelect value={filters.sort} className={pillClassName} />
          </form>
        </div>
        <ProductGrid products={products} savedIds={savedIds} />
      </div>
    </div>
  );
}
