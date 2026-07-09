import { currentUser } from "@/lib/auth/current-user";
import { searchProducts, getRecentSearches, getPopularSearchTerms } from "@/services/products/search.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { searchFiltersSchema, GENDER_LABELS, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { SearchBar } from "./search-bar";
import { SortSelect } from "./sort-select";
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

      <form action={ROUTES.search} method="GET" className="flex flex-col gap-3">
        <SearchBar initialQuery={rawParams.q ?? ""} recentSearches={recentSearches} popularSearches={popularSearches.map((p) => p.query)} />

        <div className="flex flex-wrap items-center gap-2">
          <select name="categoryId" defaultValue={rawParams.categoryId ?? ""} aria-label="Category" className={pillClassName}>
            <option value="">Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select name="gender" defaultValue={rawParams.gender ?? ""} aria-label="Gender" className={pillClassName}>
            <option value="">Gender</option>
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            name="conditionGrade"
            defaultValue={rawParams.conditionGrade ?? ""}
            aria-label="Condition"
            className={pillClassName}
          >
            <option value="">Condition</option>
            {Object.entries(CONDITION_GRADE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm text-foreground transition-colors focus-within:border-accent/50">
            <span className="text-muted-foreground">₦</span>
            <input
              name="minPrice"
              type="number"
              placeholder="Min"
              defaultValue={rawParams.minPrice ?? ""}
              aria-label="Minimum price"
              className="w-14 bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
            <span className="text-muted-foreground">–</span>
            <input
              name="maxPrice"
              type="number"
              placeholder="Max"
              defaultValue={rawParams.maxPrice ?? ""}
              aria-label="Maximum price"
              className="w-14 bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <input
            name="brand"
            defaultValue={rawParams.brand ?? ""}
            placeholder="Brand"
            aria-label="Brand"
            className="h-10 w-28 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />

          <input
            name="size"
            defaultValue={rawParams.size ?? ""}
            placeholder="Size"
            aria-label="Size"
            className="h-10 w-24 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />

          <input
            name="city"
            defaultValue={rawParams.city ?? ""}
            placeholder="Location"
            aria-label="Location"
            className="h-10 w-32 rounded-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />

          <label
            className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm transition-colors ${
              rawParams.verifiedOnly === "true" ? "border-accent bg-accent/10 text-accent" : "border-border bg-background text-foreground"
            }`}
          >
            <input type="checkbox" name="verifiedOnly" value="true" defaultChecked={rawParams.verifiedOnly === "true"} className="sr-only" />
            Verified sellers only
          </label>
        </div>
      </form>

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
