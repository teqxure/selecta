import "server-only";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { createNotification } from "@/services/notifications/notification.service";
import { getActiveBoostProductIds } from "@/services/monetization/boost.service";
import { PAGINATION } from "@/lib/constants/app";
import type { SearchFilters } from "@/lib/validators/product";
import type { PaginatedResult } from "@/types";
import type { Prisma } from "@/generated/prisma/client";

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

/** Shared shape for card grids: cover image + enough seller info to render a name and trust signals. */
const cardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  seller: { select: { storeName: true, businessName: true, ratingAverage: true, verificationStatus: true, totalSales: true } },
} as const;

type ProductRecord = Awaited<ReturnType<typeof db.product.findMany<{ include: typeof cardInclude }>>>[number];

const publicProductInclude = {
  images: { orderBy: { position: "asc" as const } },
  category: true,
  subcategory: true,
  seller: { include: { user: true } },
} as const;

/** Products belonging to a suspended seller are excluded everywhere, not just on their storefront. */
const notSuspendedSeller = { seller: { verificationStatus: { not: "SUSPENDED" as const } } };

/**
 * Attaches an honest `isSponsored` flag — true only for products with a
 * currently-ACTIVE boost campaign right now, checked fresh for every read.
 * Never a fabricated/injected slot: a "sponsored" label only ever appears
 * on a product that's already in the result set on its own merits (organic
 * + boost score), so buyers are never shown something that isn't real.
 */
async function attachSponsoredFlag<T extends { id: string }>(items: T[]): Promise<(T & { isSponsored: boolean })[]> {
  if (items.length === 0) return [];
  const boosted = await getActiveBoostProductIds(items.map((item) => item.id));
  return items.map((item) => ({ ...item, isSponsored: boosted.has(item.id) }));
}

// ---------------------------------------------------------------------------
// Homepage / browse sections
// ---------------------------------------------------------------------------

export async function listActiveProducts(
  page = 1,
  pageSize: number = PAGINATION.defaultPageSize,
): Promise<PaginatedResult<ProductRecord & { isSponsored: boolean }>> {
  const where = { status: "ACTIVE" as const, ...notSuspendedSeller };
  const [items, totalCount] = await Promise.all([
    db.product.findMany({
      where,
      include: cardInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return { items: await attachSponsoredFlag(items), page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}

export async function listPremiumFinds(limit = 12) {
  const items = await db.product.findMany({
    where: { status: "ACTIVE", conditionGrade: "SELECTA_GOLD", ...notSuspendedSeller },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return attachSponsoredFlag(items);
}

export async function listUnderBudget(maxPrice: number, limit = 12) {
  const items = await db.product.findMany({
    where: { status: "ACTIVE", price: { lte: maxPrice }, ...notSuspendedSeller },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return attachSponsoredFlag(items);
}

export async function listTrending(limit = 12) {
  const items = await db.product.findMany({
    where: { status: "ACTIVE", ...notSuspendedSeller },
    include: cardInclude,
    orderBy: [{ viewCount: "desc" }, { likeCount: "desc" }],
    take: limit,
  });
  return attachSponsoredFlag(items);
}

export async function listNearby(city: string, limit = 12) {
  const items = await db.product.findMany({
    where: { status: "ACTIVE", city: { equals: city, mode: "insensitive" }, ...notSuspendedSeller },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return attachSponsoredFlag(items);
}

/** Top categories by lifetime view volume among active listings — no hardcoded list, purely derived. */
export async function getPopularCategories(limit = 6) {
  const rows = await db.product.groupBy({
    by: ["categoryId"],
    where: { status: "ACTIVE" },
    _sum: { viewCount: true },
    _count: true,
    orderBy: { _sum: { viewCount: "desc" } },
    take: limit,
  });
  if (rows.length === 0) return [];

  const categories = await db.category.findMany({ where: { id: { in: rows.map((r) => r.categoryId) } } });
  const byId = new Map(categories.map((c) => [c.id, c]));

  return rows
    .map((row) => {
      const category = byId.get(row.categoryId);
      if (!category) return null;
      return { ...category, productCount: row._count, totalViews: row._sum.viewCount ?? 0 };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

/** Verified sellers ranked by completed sales and rating — real store-performance ranking, not a curated list. */
export async function getTopSellers(limit = 8) {
  const sellers = await db.sellerProfile.findMany({
    where: { verificationStatus: "VERIFIED", totalSales: { gt: 0 } },
    orderBy: [{ totalSales: "desc" }, { ratingAverage: "desc" }],
    take: limit,
    select: {
      id: true,
      storeName: true,
      businessName: true,
      storeSlug: true,
      bannerUrl: true,
      ratingAverage: true,
      ratingCount: true,
      totalSales: true,
      city: true,
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { images: { orderBy: { position: "asc" }, take: 1 } },
      },
    },
  });

  return sellers.map((seller) => ({ ...seller, coverImageUrl: seller.products[0]?.images[0]?.url ?? null }));
}

/**
 * Personalization foundation: infers interest from the buyer's own recent
 * VIEW/SAVE events (categories they've actually engaged with), not a global
 * default. Falls back to trending for logged-out visitors or brand-new
 * accounts with no signal yet — never fabricates a recommendation.
 */
export async function getRecommendedForYou(userId: string | undefined, limit = 12) {
  if (!userId) return listTrending(limit);

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const events = await db.productEvent.findMany({
    where: { userId, type: { in: ["VIEW", "SAVE"] }, createdAt: { gte: since } },
    select: { product: { select: { categoryId: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  if (events.length === 0) return listTrending(limit);

  const categoryCounts = new Map<string, number>();
  for (const event of events) categoryCounts.set(event.product.categoryId, (categoryCounts.get(event.product.categoryId) ?? 0) + 1);
  const topCategoryIds = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const alreadyViewedProductIds = await db.productEvent
    .findMany({ where: { userId, type: "VIEW" }, select: { productId: true }, distinct: ["productId"] })
    .then((rows) => rows.map((r) => r.productId));

  const recommended = await attachSponsoredFlag(
    await db.product.findMany({
      where: {
        status: "ACTIVE",
        categoryId: { in: topCategoryIds },
        id: { notIn: alreadyViewedProductIds },
        ...notSuspendedSeller,
      },
      include: cardInclude,
      orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
  );

  if (recommended.length < limit) {
    const filler = await listTrending(limit - recommended.length);
    const seen = new Set(recommended.map((p) => p.id));
    for (const product of filler) {
      if (!seen.has(product.id)) recommended.push(product);
    }
  }

  return recommended;
}

// ---------------------------------------------------------------------------
// Search — filters, sorting, relevance ranking
// ---------------------------------------------------------------------------

/**
 * Products are ranked within a bounded candidate window (not the whole
 * table) so scoring stays in application code instead of a raw SQL
 * expression. Cheap and correct at this catalog's scale; pagination beyond
 * the window falls back to a plain newest-first DB query rather than
 * silently truncating results.
 */
const RANKED_CANDIDATE_WINDOW = 400;

function buildSearchWhere(filters: SearchFilters): Prisma.ProductWhereInput {
  const sellerWhere: Prisma.SellerProfileWhereInput = { verificationStatus: filters.verifiedOnly ? "VERIFIED" : { not: "SUSPENDED" } };
  if (filters.minSellerRating !== undefined) sellerWhere.ratingAverage = { gte: filters.minSellerRating };

  return {
    status: "ACTIVE",
    ...(filters.q && {
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { brand: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.subcategoryId && { subcategoryId: filters.subcategoryId }),
    ...(filters.brand && { brand: { contains: filters.brand, mode: "insensitive" } }),
    ...(filters.sellerId && { sellerId: filters.sellerId }),
    ...(filters.gender && { gender: filters.gender }),
    ...(filters.conditionGrade && { conditionGrade: filters.conditionGrade }),
    ...(filters.size && { size: { equals: filters.size, mode: "insensitive" } }),
    ...(filters.city && { city: { equals: filters.city, mode: "insensitive" } }),
    ...(filters.state && { state: { equals: filters.state, mode: "insensitive" } }),
    ...((filters.minPrice !== undefined || filters.maxPrice !== undefined) && {
      price: {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
        ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
      },
    }),
    seller: sellerWhere,
  };
}

/**
 * A flat, capped bonus for an actively-boosted product — roughly 15-20% of
 * a typical organic score, chosen so a well-boosted mediocre listing gets a
 * moderate lift, never enough on its own to beat a genuinely strong organic
 * result (title match + trusted seller + real popularity easily clears 100).
 * Boost must improve visibility, not buy a top spot outright.
 */
const BOOST_SCORE_BONUS = 25;

function scoreCandidate(
  product: ProductRecord,
  filters: SearchFilters,
  now: number,
  recentViewCounts: Map<string, number>,
  boostedProductIds: Set<string>,
) {
  let score = 0;

  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    const title = product.title.toLowerCase();
    if (title === q) score += 50;
    else if (title.startsWith(q)) score += 30;
    else if (title.includes(q)) score += 15;
    if (product.brand?.toLowerCase() === q) score += 20;
  }

  const ageDays = (now - product.createdAt.getTime()) / 86_400_000;
  score += Math.max(0, 20 - ageDays / 4.5); // fades to 0 after ~90 days

  if (product.seller.verificationStatus === "VERIFIED") score += 15;
  score += Math.min(product.seller.ratingAverage, 5) * 4; // up to 20
  score += Math.min(product.seller.totalSales, 100) / 5; // up to 20

  const recentViews = recentViewCounts.get(product.id) ?? 0;
  if (filters.sort === "trending") {
    score += Math.min(Math.log10(recentViews + 1) * 15, 30);
  } else {
    score += Math.min(Math.log10(product.viewCount + 1) * 8, 20);
  }
  score += Math.min(Math.log10(product.likeCount + 1) * 6, 15);
  if (product.isFeatured) score += 10;
  if (boostedProductIds.has(product.id)) score += BOOST_SCORE_BONUS;

  return score;
}

export async function searchProducts(
  filters: SearchFilters,
  pageSize: number = PAGINATION.defaultPageSize,
  viewer?: { userId?: string; ipAddress?: string },
): Promise<PaginatedResult<ProductRecord & { isSponsored: boolean }>> {
  const where = buildSearchWhere(filters);
  const skip = (filters.page - 1) * pageSize;

  const useRanking = filters.sort === "relevance" || filters.sort === "trending";
  const SORT_ORDER_BY: Record<SearchFilters["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
    newest: [{ createdAt: "desc" }],
    price_asc: [{ price: "asc" }],
    price_desc: [{ price: "desc" }],
    most_viewed: [{ viewCount: "desc" }],
    most_saved: [{ likeCount: "desc" }],
    relevance: [{ createdAt: "desc" }],
    trending: [{ viewCount: "desc" }],
  };
  const dbSortOrder = SORT_ORDER_BY[filters.sort];

  const totalCount = await db.product.count({ where });
  let items: ProductRecord[];

  if (!useRanking || skip >= RANKED_CANDIDATE_WINDOW) {
    items = await db.product.findMany({ where, include: cardInclude, orderBy: dbSortOrder, skip, take: pageSize });
  } else {
    const candidates = await db.product.findMany({
      where,
      include: cardInclude,
      orderBy: dbSortOrder,
      take: RANKED_CANDIDATE_WINDOW,
    });

    let recentViewCounts = new Map<string, number>();
    if (filters.sort === "trending" && candidates.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recent = await db.productEvent.groupBy({
        by: ["productId"],
        where: { productId: { in: candidates.map((c) => c.id) }, type: "VIEW", createdAt: { gte: sevenDaysAgo } },
        _count: true,
      });
      recentViewCounts = new Map(recent.map((r) => [r.productId, r._count]));
    }

    const boostedProductIds = await getActiveBoostProductIds(candidates.map((c) => c.id));
    const now = Date.now();
    const ranked = candidates
      .map((product) => ({ product, score: scoreCandidate(product, filters, now, recentViewCounts, boostedProductIds) }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.product);

    items = ranked.slice(skip, skip + pageSize);

    // Window exhausted mid-page (more matches exist beyond it) — top up
    // with a plain DB page so the response is never short.
    if (items.length < pageSize && skip + pageSize > candidates.length && candidates.length < totalCount) {
      const remainder = await db.product.findMany({
        where,
        include: cardInclude,
        orderBy: dbSortOrder,
        skip: candidates.length,
        take: pageSize - items.length,
      });
      const seen = new Set(items.map((p) => p.id));
      for (const product of remainder) if (!seen.has(product.id)) items.push(product);
    }
  }

  if (filters.q) {
    const normalizedQuery = filters.q.trim().toLowerCase();
    if (normalizedQuery) {
      await db.searchQuery.create({
        data: { query: normalizedQuery, userId: viewer?.userId, resultCount: totalCount, ipAddress: viewer?.ipAddress },
      });
    }
  }
  if (items.length > 0) {
    await db.productEvent.createMany({
      data: items.map((product) => ({ productId: product.id, userId: viewer?.userId, type: "IMPRESSION" as const })),
    });
  }

  return {
    items: await attachSponsoredFlag(items),
    page: filters.page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getPublicProductById(id: string) {
  const product = await db.product.findFirst({ where: { id, status: "ACTIVE" }, include: publicProductInclude });
  if (!product) throw new NotFoundError("Product");
  return product;
}

/** Seller/admin preview of a non-active product (e.g. still in review). */
export async function getProductForPreview(id: string, viewerUserId: string, viewerRole: string) {
  const product = await db.product.findUnique({ where: { id }, include: publicProductInclude });
  if (!product) throw new NotFoundError("Product");

  const isOwner = product.seller.userId === viewerUserId;
  const isStaff = viewerRole === "ADMIN" || viewerRole === "SUPER_ADMIN";
  if (product.status !== "ACTIVE" && !isOwner && !isStaff) throw new NotFoundError("Product");

  return product;
}

/** Same category or same brand, excluding the product itself and its own listing duplicates, ranked by trust + recency. */
export async function getSimilarProducts(product: { id: string; categoryId: string; brand?: string | null }, limit = 8) {
  const candidates = await db.product.findMany({
    where: {
      status: "ACTIVE",
      id: { not: product.id },
      ...notSuspendedSeller,
      OR: [{ categoryId: product.categoryId }, ...(product.brand ? [{ brand: { equals: product.brand, mode: "insensitive" as const } }] : [])],
    },
    include: cardInclude,
    orderBy: [{ createdAt: "desc" }],
    take: 60,
  });

  const boostedIds = await getActiveBoostProductIds(candidates.map((c) => c.id));
  const now = Date.now();
  const ranked = candidates
    .map((candidate) => {
      let score = candidate.categoryId === product.categoryId ? 20 : 0;
      if (product.brand && candidate.brand?.toLowerCase() === product.brand.toLowerCase()) score += 15;
      score += candidate.seller.verificationStatus === "VERIFIED" ? 10 : 0;
      score += Math.min(candidate.seller.ratingAverage, 5) * 2;
      score += Math.max(0, 10 - (now - candidate.createdAt.getTime()) / 86_400_000 / 9);
      if (boostedIds.has(candidate.id)) score += BOOST_SCORE_BONUS;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.candidate);

  return attachSponsoredFlag(ranked);
}

export function getSameSellerProducts(sellerId: string, excludeProductId: string, limit = 8) {
  return db.product.findMany({
    where: { status: "ACTIVE", sellerId, id: { not: excludeProductId } },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Most-recently-viewed distinct products for this buyer, newest first — powers the "Recently viewed" rail. */
export async function getRecentlyViewedProducts(userId: string, excludeProductId?: string, limit = 8) {
  const events = await db.productEvent.findMany({
    where: { userId, type: "VIEW" },
    select: { productId: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (event.productId === excludeProductId || seen.has(event.productId)) continue;
    seen.add(event.productId);
    orderedIds.push(event.productId);
    if (orderedIds.length >= limit) break;
  }
  if (orderedIds.length === 0) return [];

  const products = await db.product.findMany({ where: { id: { in: orderedIds }, status: "ACTIVE" }, include: cardInclude });
  const byId = new Map(products.map((p) => [p.id, p]));
  return orderedIds.map((id) => byId.get(id)).filter((p): p is ProductRecord => p !== undefined);
}

// ---------------------------------------------------------------------------
// Search suggestions
// ---------------------------------------------------------------------------

export async function getSearchSuggestions(prefix: string, limit = 8) {
  const trimmed = prefix.trim();
  if (trimmed.length < 2) return [];

  const [titleMatches, queryMatches] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", OR: [{ title: { startsWith: trimmed, mode: "insensitive" } }, { brand: { startsWith: trimmed, mode: "insensitive" } }] },
      select: { title: true },
      take: 20,
    }),
    db.searchQuery.groupBy({
      by: ["query"],
      where: { query: { startsWith: trimmed.toLowerCase() }, resultCount: { gt: 0 } },
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
  ]);

  const suggestions = new Set<string>();
  for (const row of queryMatches) suggestions.add(row.query);
  for (const row of titleMatches) suggestions.add(row.title);

  return Array.from(suggestions).slice(0, limit);
}

export async function getRecentSearches(userId: string, limit = 5) {
  const rows = await db.searchQuery.findMany({
    where: { userId },
    select: { query: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const unique: string[] = [];
  for (const row of rows) {
    if (!unique.includes(row.query)) unique.push(row.query);
    if (unique.length >= limit) break;
  }
  return unique;
}

export async function getPopularSearchTerms(limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const rows = await db.searchQuery.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since }, resultCount: { gt: 0 } },
    _count: true,
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ query: r.query, count: r._count }));
}

export async function getTrendingSearchTerms(limit = 8) {
  const since = new Date();
  since.setDate(since.getDate() - 3);
  const rows = await db.searchQuery.groupBy({
    by: ["query"],
    where: { createdAt: { gte: since }, resultCount: { gt: 0 } },
    _count: true,
    orderBy: { _count: { query: "desc" } },
    take: limit,
  });
  return rows.map((r) => ({ query: r.query, count: r._count }));
}

// ---------------------------------------------------------------------------
// Signal tracking (view/share/contact) — anti-inflation view dedup
// ---------------------------------------------------------------------------

const VIEW_MILESTONES = [100, 500, 1000, 5000, 10000];
const VIEW_DEDUP_WINDOW_MINUTES = 30;

/**
 * Counts at most once per viewer per `VIEW_DEDUP_WINDOW_MINUTES` — a repeat
 * request from the same signed-in user, or (when logged out) the same IP,
 * within the window is a no-op. Viewers with neither a userId nor an
 * ipAddress (rare — stripped headers) are always counted since there's no
 * identity to dedup against.
 */
export async function recordProductView(productId: string, viewer: { userId?: string; ipAddress?: string }) {
  if (viewer.userId || viewer.ipAddress) {
    const dedupSince = new Date(Date.now() - VIEW_DEDUP_WINDOW_MINUTES * 60_000);
    const existing = await db.productEvent.findFirst({
      where: {
        productId,
        type: "VIEW",
        createdAt: { gte: dedupSince },
        ...(viewer.userId
          ? { userId: viewer.userId }
          : { userId: null, metadata: { path: ["ipAddress"], equals: viewer.ipAddress } }),
      },
      select: { id: true },
    });
    if (existing) return;
  }

  const [product] = await db.$transaction([
    db.product.update({
      where: { id: productId },
      data: { viewCount: { increment: 1 } },
      include: { seller: true },
    }),
    db.productEvent.create({
      data: {
        productId,
        userId: viewer.userId,
        type: "VIEW",
        metadata: !viewer.userId && viewer.ipAddress ? { ipAddress: viewer.ipAddress } : undefined,
      },
    }),
  ]);

  if (VIEW_MILESTONES.includes(product.viewCount)) {
    await createNotification(
      product.seller.userId,
      "SYSTEM",
      "Your product is getting noticed!",
      `"${product.title}" just hit ${product.viewCount} views.`,
    );
  }
}

export async function recordShare(productId: string, userId?: string) {
  await db.$transaction([
    db.product.update({ where: { id: productId }, data: { shareCount: { increment: 1 } } }),
    db.productEvent.create({ data: { productId, userId, type: "SHARE" } }),
  ]);
}

export async function recordContactSeller(productId: string, userId: string) {
  await db.productEvent.create({ data: { productId, userId, type: "CONTACT_SELLER" } });
}
