"use client";

import { SEARCH_SORT_OPTIONS, SEARCH_SORT_LABELS, type SearchSort } from "@/lib/validators/product";

export function SortSelect({ value, className }: { value: SearchSort; className: string }) {
  return (
    <select
      name="sort"
      defaultValue={value}
      aria-label="Sort by"
      className={className}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {SEARCH_SORT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {SEARCH_SORT_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
