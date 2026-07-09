import "server-only";
import { db } from "@/lib/db";

/** Lifetime monetization revenue + current active counts — summed from the ledger, never a mutable counter. */
export async function getRevenueOverview() {
  const [subscriptionAgg, boostAgg, activeSubscriptions, runningCampaigns] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { type: "SUBSCRIPTION_REVENUE" }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { type: "BOOST_REVENUE" }, _sum: { amount: true } }),
    db.sellerSubscription.count({ where: { status: "ACTIVE" } }),
    db.boostCampaign.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    subscriptionRevenue: Number(subscriptionAgg._sum.amount ?? 0),
    boostRevenue: Number(boostAgg._sum.amount ?? 0),
    activeSubscriptions,
    runningCampaigns,
  };
}

export async function getMonthlyMonetizationRevenueHistory(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const entries = await db.ledgerEntry.findMany({
    where: { createdAt: { gte: since }, type: { in: ["SUBSCRIPTION_REVENUE", "BOOST_REVENUE"] } },
    select: { amount: true, type: true, createdAt: true },
  });

  const buckets = new Map<string, { subscription: number; boost: number }>();
  for (let i = 0; i < months; i++) {
    const date = new Date(since);
    date.setMonth(date.getMonth() + i);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, { subscription: 0, boost: 0 });
  }

  for (const entry of entries) {
    const key = `${entry.createdAt.getFullYear()}-${entry.createdAt.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (entry.type === "SUBSCRIPTION_REVENUE") bucket.subscription += Number(entry.amount);
    if (entry.type === "BOOST_REVENUE") bucket.boost += Number(entry.amount);
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return { label: new Date(year, month, 1).toLocaleDateString("en-NG", { month: "short", year: "2-digit" }), ...value };
  });
}

/** Sellers ranked by total lifetime subscription + boost spend — the platform's highest-value seller accounts. */
export async function getTopSpendingSellers(limit = 10) {
  const rows = await db.ledgerEntry.groupBy({
    by: ["sellerId"],
    where: { type: { in: ["SUBSCRIPTION_REVENUE", "BOOST_REVENUE"] }, sellerId: { not: null } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });
  const sellerIds = rows.map((r) => r.sellerId).filter((id): id is string => id !== null);
  if (sellerIds.length === 0) return [];

  const sellers = await db.sellerProfile.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, storeName: true, businessName: true },
  });
  const byId = new Map(sellers.map((s) => [s.id, s]));

  return rows
    .map((row) => {
      const seller = row.sellerId ? byId.get(row.sellerId) : undefined;
      if (!seller) return null;
      return { sellerId: seller.id, name: seller.storeName ?? seller.businessName, totalSpend: Number(row._sum.amount ?? 0) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}
