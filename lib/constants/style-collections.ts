/**
 * Curated entry points into search, keyed off free-text matching against
 * product titles/brands — there's no dedicated "vibe" taxonomy in the
 * schema yet (deliberately not adding one here). Shared between the home
 * page (which resolves a preview image per query) and `StyleCollections`
 * (which renders the resulting tiles).
 */
export const STYLE_COLLECTIONS = [
  { label: "Church fits", query: "church" },
  { label: "Corporate looks", query: "corporate" },
  { label: "Weekend wears", query: "weekend" },
  { label: "Street style", query: "street" },
] as const;
