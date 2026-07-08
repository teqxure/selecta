import "server-only";
import { db } from "@/lib/db";

/**
 * Platform-wide financial snapshot for the Super Admin finance dashboard.
 *
 * Historical/cumulative figures (GMV, commission earned, completed
 * payouts, refunds) are summed from `LedgerEntry` — the append-only
 * journal — never re-derived from the CURRENT status of a mutable Order/
 * Transaction/Withdrawal row. That distinction matters: a Transaction's
 * `status` column tells you what's true *right now*, but summing "rows
 * where status = X" as if it were history breaks the moment any row's
 * status can legitimately change again (dispute resolution, correction) —
 * the ledger entry recorded at the moment the money actually moved does
 * not change retroactively.
 *
 * Current-state figures (held in escrow, pending payouts, failed payment
 * count) are intentionally read from live tables — they describe "what's
 * true right now," which is exactly what a status column is for.
 */
export async function getFinanceOverview() {
  const [gmv, commissionEarned, refunded, payoutsPaid, held, pendingPayouts, failedPayments, pendingWithdrawals] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { type: "CUSTOMER_PAYMENT" }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { type: "COMMISSION_EARNED" }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { type: "REFUND" }, _sum: { amount: true }, _count: true }),
    db.ledgerEntry.aggregate({ where: { type: "WITHDRAWAL_PAID" }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { status: "HELD_IN_ESCROW" }, _sum: { sellerAmount: true } }),
    db.wallet.aggregate({ _sum: { balance: true } }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.withdrawal.aggregate({ where: { status: { in: ["REQUESTED", "PROCESSING"] } }, _sum: { amount: true }, _count: true }),
  ]);

  const commissionEarnedAmount = Number(commissionEarned._sum.amount ?? 0);

  return {
    gmv: Number(gmv._sum.amount ?? 0),
    // Commission is currently the platform's only revenue stream, so these
    // two are the same number today — kept as separate fields since they
    // answer different questions, and will diverge the moment a second
    // revenue stream (listing fees, subscriptions, etc.) is added.
    platformRevenue: commissionEarnedAmount,
    commissionEarned: commissionEarnedAmount,
    heldInEscrow: Number(held._sum.sellerAmount ?? 0),
    refunded: { amount: Math.abs(Number(refunded._sum.amount ?? 0)), count: refunded._count },
    payoutsPaid: Number(payoutsPaid._sum.amount ?? 0),
    pendingPayouts: Number(pendingPayouts._sum.balance ?? 0),
    failedPayments,
    pendingWithdrawals: { amount: Number(pendingWithdrawals._sum.amount ?? 0), count: pendingWithdrawals._count },
  };
}

/** Monthly GMV and realized commission for the last `months` calendar months, oldest first — sourced from the ledger. */
export async function getMonthlyRevenueHistory(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const entries = await db.ledgerEntry.findMany({
    where: { createdAt: { gte: since }, type: { in: ["CUSTOMER_PAYMENT", "COMMISSION_EARNED"] } },
    select: { amount: true, type: true, createdAt: true },
  });

  const buckets = new Map<string, { gmv: number; commission: number }>();
  for (let i = 0; i < months; i++) {
    const date = new Date(since);
    date.setMonth(date.getMonth() + i);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, { gmv: 0, commission: 0 });
  }

  for (const entry of entries) {
    const key = `${entry.createdAt.getFullYear()}-${entry.createdAt.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (entry.type === "CUSTOMER_PAYMENT") bucket.gmv += Number(entry.amount);
    if (entry.type === "COMMISSION_EARNED") bucket.commission += Number(entry.amount);
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: new Date(year, month, 1).toLocaleDateString("en-NG", { month: "short" }),
      ...value,
    };
  });
}

/** Top sellers by realized commission contribution — the "seller performance" chart. */
export async function getSellerPerformance(limit = 8) {
  const grouped = await db.ledgerEntry.groupBy({
    by: ["sellerId"],
    where: { type: "COMMISSION_EARNED", sellerId: { not: null } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  const sellerIds = grouped.map((row) => row.sellerId).filter((id): id is string => id !== null);
  const sellers = await db.sellerProfile.findMany({ where: { id: { in: sellerIds } } });
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));

  return grouped
    .filter((row) => row.sellerId !== null)
    .map((row) => {
      const seller = sellerById.get(row.sellerId!);
      return {
        sellerId: row.sellerId!,
        label: seller?.storeName ?? seller?.businessName ?? "Unknown seller",
        commissionContributed: Number(row._sum.amount ?? 0),
      };
    });
}
