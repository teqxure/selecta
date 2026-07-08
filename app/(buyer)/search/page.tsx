import { Search as SearchIcon } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { searchProducts } from "@/services/products/product.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { searchFiltersSchema, GENDER_LABELS, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { Button } from "@/components/ui/Button";
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
  const filters = parsed.success ? parsed.data : { page: 1 };

  const [{ items: products, totalCount }, categories, user] = await Promise.all([
    searchProducts(filters),
    listActiveCategoryTree(),
    currentUser(),
  ]);
  const savedIds = user ? await getSavedProductIds(user.id, products.map((p) => p.id)) : undefined;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="font-display text-2xl font-semibold text-foreground">Explore</h1>

      <form action={ROUTES.search} method="GET" className="flex flex-col gap-3">
        <div className="flex h-13 items-center gap-2 rounded-full border border-border bg-secondary pl-5 pr-1.5 shadow-[var(--shadow-card)] transition-colors focus-within:border-accent/50">
          <SearchIcon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <input
            name="q"
            defaultValue={rawParams.q ?? ""}
            placeholder="Search by title or brand"
            aria-label="Search"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button type="submit" variant="accent" size="sm" className="rounded-full">
            Search
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            name="categoryId"
            defaultValue={rawParams.categoryId ?? ""}
            aria-label="Category"
            className={pillClassName}
          >
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
        </div>
      </form>

      <div className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">
          {totalCount} result{totalCount === 1 ? "" : "s"}
        </p>
        <ProductGrid products={products} savedIds={savedIds} />
      </div>
    </div>
  );
}
