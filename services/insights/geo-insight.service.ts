import "server-only";
import { db } from "@/lib/db";

/**
 * Ranked, table/bar-chart geo analytics — deliberately not a geographic
 * tile-based heat map. No maps SDK is integrated in this pass (see
 * services/logistics/delivery-engine.service.ts's doc comments for why),
 * so "heat map" here means ranked-by-city bars using the existing
 * `BarChart` component, not colored map overlays. Real map-based
 * visualization is future work once a maps provider is chosen.
 */

const EVENT_SAMPLE_SIZE = 5000;

export interface CityCount {
  city: string;
  count: number;
}

/** Buyer interest (VIEW/SAVE) grouped by listing city over the trailing window. */
export async function getDemandByCity(days = 30, limit = 10): Promise<CityCount[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await db.productEvent.findMany({
    where: { type: { in: ["VIEW", "SAVE"] }, createdAt: { gte: since } },
    select: { product: { select: { city: true } } },
    take: EVENT_SAMPLE_SIZE,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.product.city) continue;
    counts.set(event.product.city, (counts.get(event.product.city) ?? 0) + 1);
  }
  return rankCounts(counts, limit);
}

/** Active listing volume grouped by city — a direct groupBy, not sampled. */
export async function getSupplyByCity(limit = 10): Promise<CityCount[]> {
  const rows = await db.product.groupBy({
    by: ["city"],
    where: { status: "ACTIVE", city: { not: null } },
    _count: true,
    orderBy: { _count: { city: "desc" } },
    take: limit,
  });
  return rows.filter((r): r is typeof r & { city: string } => r.city !== null).map((r) => ({ city: r.city, count: r._count }));
}

async function countActiveListingsByCity(createdWindow: { gte: Date; lt?: Date }) {
  const rows = await db.product.groupBy({
    by: ["city"],
    where: { city: { not: null }, createdAt: createdWindow },
    _count: true,
  });
  return new Map(rows.filter((r) => r.city).map((r) => [r.city as string, r._count]));
}

export interface CityGrowth {
  city: string;
  recentListings: number;
  priorListings: number;
  growth: number;
}

/** New-listing volume this week vs. the week before, per city — positive growth means accelerating supply. */
export async function getFastestGrowingCities(limit = 10): Promise<CityGrowth[]> {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  const [recent, prior] = await Promise.all([
    countActiveListingsByCity({ gte: oneWeekAgo }),
    countActiveListingsByCity({ gte: twoWeeksAgo, lt: oneWeekAgo }),
  ]);

  const cities = new Set([...recent.keys(), ...prior.keys()]);
  return [...cities]
    .map((city) => {
      const recentListings = recent.get(city) ?? 0;
      const priorListings = prior.get(city) ?? 0;
      return { city, recentListings, priorListings, growth: recentListings - priorListings };
    })
    .filter((row) => row.recentListings > 0)
    .sort((a, b) => b.growth - a.growth)
    .slice(0, limit);
}

export interface UnderSuppliedCity extends CityCount {
  supply: number;
}

/** Cities with real buyer demand but comparatively little active supply — a sourcing/seller-recruitment signal. */
export async function getLowInventoryAreas(days = 30, limit = 10): Promise<UnderSuppliedCity[]> {
  const [demand, supply] = await Promise.all([getDemandByCity(days, 50), getSupplyByCity(50)]);
  const supplyByCity = new Map(supply.map((row) => [row.city, row.count]));

  return demand
    .map((row) => ({ city: row.city, count: row.count, supply: supplyByCity.get(row.city) ?? 0 }))
    .filter((row) => row.supply < row.count)
    .sort((a, b) => b.count / (b.supply + 1) - a.count / (a.supply + 1))
    .slice(0, limit);
}

export interface MarketRanking {
  label: string;
  value: number;
}

/** Units sold, grouped by the seller's specific market/stall (`Product.market`) — falls back to city when a product has no market set. */
export async function getTopSellingDistricts(days = 30, limit = 10): Promise<MarketRanking[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await db.orderItem.findMany({
    where: { createdAt: { gte: since } },
    select: { quantity: true, product: { select: { market: true, city: true } } },
    take: EVENT_SAMPLE_SIZE,
  });

  const counts = new Map<string, number>();
  for (const item of items) {
    const label = item.product.market || item.product.city;
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + item.quantity);
  }
  return rankValues(counts, limit);
}

/** Revenue (line-item total), grouped the same way as `getTopSellingDistricts` — the money-weighted counterpart to units sold. */
export async function getTopPerformingMarkets(days = 30, limit = 10): Promise<MarketRanking[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const items = await db.orderItem.findMany({
    where: { createdAt: { gte: since } },
    select: { quantity: true, unitPrice: true, product: { select: { market: true, city: true } } },
    take: EVENT_SAMPLE_SIZE,
  });

  const totals = new Map<string, number>();
  for (const item of items) {
    const label = item.product.market || item.product.city;
    if (!label) continue;
    totals.set(label, (totals.get(label) ?? 0) + Number(item.unitPrice) * item.quantity);
  }
  return rankValues(totals, limit);
}

function rankCounts(counts: Map<string, number>, limit: number): CityCount[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([city, count]) => ({ city, count }));
}

function rankValues(values: Map<string, number>, limit: number): MarketRanking[] {
  return [...values.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: Math.round(value) }));
}
