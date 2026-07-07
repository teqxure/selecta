import { currentUser } from "@/lib/auth/current-user";
import { searchProducts } from "@/services/products/product.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { searchFiltersSchema, GENDER_LABELS, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { ROUTES } from "@/lib/constants/routes";

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
      <h1 className="text-2xl font-semibold text-foreground">Search</h1>

      <form action={ROUTES.search} method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-secondary p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-medium text-foreground">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={rawParams.q ?? ""}
            placeholder="Title or brand"
            className="h-10 w-48 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={rawParams.categoryId ?? ""}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-sm font-medium text-foreground">
            Gender
          </label>
          <select
            id="gender"
            name="gender"
            defaultValue={rawParams.gender ?? ""}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Any</option>
            {Object.entries(GENDER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="conditionGrade" className="text-sm font-medium text-foreground">
            Condition
          </label>
          <select
            id="conditionGrade"
            name="conditionGrade"
            defaultValue={rawParams.conditionGrade ?? ""}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">Any</option>
            {Object.entries(CONDITION_GRADE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="minPrice" className="text-sm font-medium text-foreground">
            Min price
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            defaultValue={rawParams.minPrice ?? ""}
            className="h-10 w-28 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxPrice" className="text-sm font-medium text-foreground">
            Max price
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            defaultValue={rawParams.maxPrice ?? ""}
            className="h-10 w-28 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="size" className="text-sm font-medium text-foreground">
            Size
          </label>
          <input
            id="size"
            name="size"
            defaultValue={rawParams.size ?? ""}
            className="h-10 w-20 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-sm font-medium text-foreground">
            Location
          </label>
          <input
            id="city"
            name="city"
            defaultValue={rawParams.city ?? ""}
            className="h-10 w-32 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </div>

        <button type="submit" className="h-10 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">
          Search
        </button>
      </form>

      <p className="text-sm text-muted-foreground">{totalCount} result{totalCount === 1 ? "" : "s"}</p>

      <ProductGrid products={products} savedIds={savedIds} />
    </div>
  );
}
