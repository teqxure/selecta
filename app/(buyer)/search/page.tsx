import { currentUser } from "@/lib/auth/current-user";
import { searchProducts } from "@/services/products/product.service";
import { getSavedProductIds } from "@/services/products/saved-product.service";
import { listActiveCategoryTree } from "@/services/categories/category.service";
import { searchFiltersSchema, GENDER_LABELS, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { ProductGrid } from "@/components/marketplace/ProductGrid";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

const selectClassName =
  "h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-1 focus:ring-offset-background";

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

      <form
        action={ROUTES.search}
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-secondary p-4 shadow-[var(--shadow-card)]"
      >
        <Input id="q" name="q" label="Search" defaultValue={rawParams.q ?? ""} placeholder="Title or brand" className="w-48" />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
            Category
          </label>
          <select id="categoryId" name="categoryId" defaultValue={rawParams.categoryId ?? ""} className={selectClassName}>
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
          <select id="gender" name="gender" defaultValue={rawParams.gender ?? ""} className={selectClassName}>
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
          <select id="conditionGrade" name="conditionGrade" defaultValue={rawParams.conditionGrade ?? ""} className={selectClassName}>
            <option value="">Any</option>
            {Object.entries(CONDITION_GRADE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Input id="minPrice" name="minPrice" type="number" label="Min price" defaultValue={rawParams.minPrice ?? ""} className="w-28" />
        <Input id="maxPrice" name="maxPrice" type="number" label="Max price" defaultValue={rawParams.maxPrice ?? ""} className="w-28" />
        <Input id="size" name="size" label="Size" defaultValue={rawParams.size ?? ""} className="w-20" />
        <Input id="city" name="city" label="Location" defaultValue={rawParams.city ?? ""} className="w-32" />

        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {totalCount} result{totalCount === 1 ? "" : "s"}
      </p>

      <ProductGrid products={products} savedIds={savedIds} />
    </div>
  );
}
