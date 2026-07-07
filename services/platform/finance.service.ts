import "server-only";
import { db } from "@/lib/db";

/**
 * Platform-wide financial snapshot for the Super Admin finance dashboard.
 * GMV/held/refunded are derived from Transaction (only ever created once a
 * payment actually succeeds), commission earned is realized only once a
 * transaction is RELEASED (not while still sitting in escrow), and payouts
 * come from approved Withdrawals — never a single "trust me" number.
 */
export async function getFinanceOverview() {
  const [gmv, releasedCommission, held, refunded, payouts, failedPayments, pendingWithdrawals] = await Promise.all([
    db.transaction.aggregate({ _sum: { amount: true } }),
    db.transaction.aggregate({ where: { status: "RELEASED" }, _sum: { commissionAmount: true } }),
    db.transaction.aggregate({ where: { status: "HELD_IN_ESCROW" }, _sum: { sellerAmount: true } }),
    db.transaction.aggregate({ where: { status: "REFUNDED" }, _sum: { sellerAmount: true }, _count: true }),
    db.withdrawal.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.payment.count({ where: { status: "FAILED" } }),
    db.withdrawal.aggregate({ where: { status: { in: ["REQUESTED", "PROCESSING"] } }, _sum: { amount: true }, _count: true }),
  ]);

  return {
    gmv: Number(gmv._sum.amount ?? 0),
    commissionEarned: Number(releasedCommission._sum.commissionAmount ?? 0),
    heldInEscrow: Number(held._sum.sellerAmount ?? 0),
    refunded: { amount: Number(refunded._sum.sellerAmount ?? 0), count: refunded._count },
    payoutsPaid: Number(payouts._sum.amount ?? 0),
    failedPayments,
    pendingWithdrawals: { amount: Number(pendingWithdrawals._sum.amount ?? 0), count: pendingWithdrawals._count },
  };
}

/** Monthly GMV and realized commission for the last `months` calendar months, oldest first. */
export async function getMonthlyRevenueHistory(months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const transactions = await db.transaction.findMany({
    where: { createdAt: { gte: since } },
    select: { amount: true, commissionAmount: true, status: true, createdAt: true },
  });

  const buckets = new Map<string, { gmv: number; commission: number }>();
  for (let i = 0; i < months; i++) {
    const date = new Date(since);
    date.setMonth(date.getMonth() + i);
    buckets.set(`${date.getFullYear()}-${date.getMonth()}`, { gmv: 0, commission: 0 });
  }

  for (const transaction of transactions) {
    const key = `${transaction.createdAt.getFullYear()}-${transaction.createdAt.getMonth()}`;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.gmv += Number(transaction.amount);
    if (transaction.status === "RELEASED") bucket.commission += Number(transaction.commissionAmount);
  }

  return Array.from(buckets.entries()).map(([key, value]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: new Date(year, month, 1).toLocaleDateString("en-NG", { month: "short" }),
      ...value,
    };
  });
}
