import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

const COLLECTIONS = [
  { label: "Church fits", query: "church", emoji: "⛪" },
  { label: "Corporate looks", query: "corporate", emoji: "💼" },
  { label: "Weekend wears", query: "weekend", emoji: "🌤️" },
  { label: "Street style", query: "street", emoji: "🛹" },
];

/**
 * Curated entry points into search, keyed off free-text matching against
 * product titles/brands — there's no dedicated "vibe" taxonomy in the
 * schema yet (deliberately not adding one here; see design summary).
 */
export function StyleCollections() {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {COLLECTIONS.map((collection) => (
        <Link
          key={collection.label}
          href={`${ROUTES.search}?q=${encodeURIComponent(collection.query)}`}
          className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          <span aria-hidden>{collection.emoji}</span>
          {collection.label}
        </Link>
      ))}
    </div>
  );
}
