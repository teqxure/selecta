"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GENDER_LABELS, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { ROUTES } from "@/lib/constants/routes";

interface CategoryOption {
  id: string;
  name: string;
}

const fieldClassName =
  "h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * A single "Filters" entry point instead of a long row of pills — the
 * previous inline layout wrapped across several rows on phones and read as
 * clutter. All fields live in one form here (rather than duplicated across
 * an inline-desktop row and a mobile sheet) so there's only ever one set of
 * same-named inputs in the DOM — two would both serialize into the GET
 * query string on submit.
 */
export function FilterBar({ categories, rawParams }: { categories: CategoryOption[]; rawParams: Record<string, string | undefined> }) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    rawParams.categoryId,
    rawParams.gender,
    rawParams.conditionGrade,
    rawParams.minPrice,
    rawParams.maxPrice,
    rawParams.brand,
    rawParams.size,
    rawParams.city,
    rawParams.verifiedOnly === "true" ? "yes" : undefined,
  ].filter(Boolean).length;

  const clearHref = rawParams.q ? `${ROUTES.search}?q=${encodeURIComponent(rawParams.q)}` : ROUTES.search;

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="w-fit gap-2">
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
        Filters
        {activeCount > 0 && (
          <Badge tone="accent" solid className="px-1.5 py-0 text-[11px]">
            {activeCount}
          </Badge>
        )}
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Filters" className="max-h-[85vh] overflow-y-auto">
        <form action={ROUTES.search} method="GET" className="flex flex-col gap-4">
          <input type="hidden" name="q" value={rawParams.q ?? ""} />
          <input type="hidden" name="sort" value={rawParams.sort ?? "relevance"} />

          <Field label="Category" htmlFor="categoryId">
            <select id="categoryId" name="categoryId" defaultValue={rawParams.categoryId ?? ""} className={fieldClassName}>
              <option value="">Any category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Gender" htmlFor="gender">
            <select id="gender" name="gender" defaultValue={rawParams.gender ?? ""} className={fieldClassName}>
              <option value="">Any</option>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Condition" htmlFor="conditionGrade">
            <select id="conditionGrade" name="conditionGrade" defaultValue={rawParams.conditionGrade ?? ""} className={fieldClassName}>
              <option value="">Any</option>
              {Object.entries(CONDITION_GRADE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price range (₦)" htmlFor="minPrice">
            <div className="flex items-center gap-2">
              <input
                id="minPrice"
                name="minPrice"
                type="number"
                placeholder="Min"
                defaultValue={rawParams.minPrice ?? ""}
                aria-label="Minimum price"
                className={fieldClassName}
              />
              <span className="text-muted-foreground">–</span>
              <input
                name="maxPrice"
                type="number"
                placeholder="Max"
                defaultValue={rawParams.maxPrice ?? ""}
                aria-label="Maximum price"
                className={fieldClassName}
              />
            </div>
          </Field>

          <Field label="Brand" htmlFor="brand">
            <input id="brand" name="brand" defaultValue={rawParams.brand ?? ""} placeholder="Any brand" className={fieldClassName} />
          </Field>

          <Field label="Size" htmlFor="size">
            <input id="size" name="size" defaultValue={rawParams.size ?? ""} placeholder="Any size" className={fieldClassName} />
          </Field>

          <Field label="Location" htmlFor="city">
            <input id="city" name="city" defaultValue={rawParams.city ?? ""} placeholder="Any city" className={fieldClassName} />
          </Field>

          <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="verifiedOnly"
              value="true"
              defaultChecked={rawParams.verifiedOnly === "true"}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Verified sellers only
          </label>

          <div className="mt-2 flex items-center gap-4 border-t border-border pt-4">
            <a href={clearHref} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Clear all
            </a>
            <Button type="submit" variant="accent" className="ml-auto flex-1" onClick={() => setOpen(false)}>
              Show results
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
