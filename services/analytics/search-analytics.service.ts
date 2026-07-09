import "server-only";
import { db } from "@/lib/db";

/**
 * Platform-wide search/discovery reporting for the Super Admin console.
 * Reads only `SearchQuery` (logged from `searchProducts`) and `ProductEvent`
 * — nothing here is hardcoded or sampled.
 */
export async function getTopSearches(days = 30, limit = 15) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db.searchQuery.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since } },
    _count: true,
    _avg: { resultCount: true },
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });

  return rows.map((row) => ({ query: row.query, count: row._count, avgResults: Math.round(row._avg.resultCount ?? 0) }));
}

export async function getZeroResultSearches(days = 30, limit = 15) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db.searchQuery.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since }, resultCount: 0 },
    _count: true,
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });

  return rows.map((row) => ({ query: row.query, count: row._count }));
}

/** Categories with the most VIEW activity in the window — a real recent-activity signal, not lifetime totals. */
export async function getTrendingCategories(days = 7, limit = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await db.productEvent.findMany({
    where: { type: "VIEW", createdAt: { gte: since } },
    select: { product: { select: { categoryId: true, category: { select: { name: true } } } } },
    take: 5000,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const event of events) {
    const entry = counts.get(event.product.categoryId) ?? { name: event.product.category.name, count: 0 };
    entry.count += 1;
    counts.set(event.product.categoryId, entry);
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Most-viewed and most-saved products in the window — the platform's clearest "what buyers want" signal. */
export async function getBuyerInterest(days = 7, limit = 10) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [viewRows, saveRows] = await Promise.all([
    db.productEvent.groupBy({
      by: ["productId"],
      where: { type: "VIEW", createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: limit,
    }),
    db.productEvent.groupBy({
      by: ["productId"],
      where: { type: "SAVE", createdAt: { gte: since } },
      _count: true,
      orderBy: { _count: { productId: "desc" } },
      take: limit,
    }),
  ]);

  const productIds = Array.from(new Set([...viewRows.map((r) => r.productId), ...saveRows.map((r) => r.productId)]));
  const products = await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, title: true } });
  const titleById = new Map(products.map((p) => [p.id, p.title]));

  return {
    mostViewed: viewRows.map((r) => ({ productId: r.productId, title: titleById.get(r.productId) ?? "Removed listing", count: r._count })),
    mostSaved: saveRows.map((r) => ({ productId: r.productId, title: titleById.get(r.productId) ?? "Removed listing", count: r._count })),
  };
}

export async function getSearchVolumeSummary(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [totalSearches, zeroResultCount] = await Promise.all([
    db.searchQuery.count({ where: { createdAt: { gte: since } } }),
    db.searchQuery.count({ where: { createdAt: { gte: since }, resultCount: 0 } }),
  ]);

  return { totalSearches, zeroResultCount, zeroResultRate: totalSearches > 0 ? zeroResultCount / totalSearches : 0 };
}
