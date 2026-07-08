import "server-only";
import { db } from "@/lib/db";

/**
 * Customer-facing stats for the Super Admin User Detail Center (Phase 2/8).
 * Spending is summed from the ledger (`CUSTOMER_PAYMENT` entries), not
 * from `Order.totalAmount` directly — consistent with the rest of this
 * codebase's rule that historical money figures come from the immutable
 * ledger, never mutable status columns.
 */
export async function getCustomerActivitySummary(userId: string) {
  const [totalOrders, completedOrders, cancelledOrders, refundedOrders, reviewsSubmitted, spendingAggregate, refundAggregate] =
    await Promise.all([
      db.order.count({ where: { buyerId: userId } }),
      db.order.count({ where: { buyerId: userId, status: "COMPLETED" } }),
      db.order.count({ where: { buyerId: userId, status: "CANCELLED" } }),
      db.order.count({ where: { buyerId: userId, status: "REFUNDED" } }),
      db.review.count({ where: { authorId: userId } }),
      db.ledgerEntry.aggregate({ where: { userId, type: "CUSTOMER_PAYMENT" }, _sum: { amount: true } }),
      db.ledgerEntry.aggregate({ where: { userId, type: "REFUND" }, _sum: { amount: true } }),
    ]);

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    refundedOrders,
    reviewsSubmitted,
    totalSpending: Math.abs(Number(spendingAggregate._sum.amount ?? 0)),
    totalRefunded: Math.abs(Number(refundAggregate._sum.amount ?? 0)),
  };
}
