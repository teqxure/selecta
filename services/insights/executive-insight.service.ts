import "server-only";
import { db } from "@/lib/db";

const LIVE_ORDER_STATUSES = ["CREATED", "AWAITING_PAYMENT", "PAID", "PROCESSING", "READY_FOR_PICKUP", "IN_TRANSIT", "DISPUTED"] as const;
const ACTIVE_DELIVERY_STATUSES = ["PENDING", "PREPARING", "READY_FOR_PICKUP", "RIDER_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ON_THE_WAY", "NEARBY"] as const;

/** Plain live counts across every new center this phase added — the Executive Center's cross-cutting "what needs attention" row. */
export async function getLiveOperationalCounts() {
  const [liveOrders, activeDeliveries, unassignedDeliveries, pendingDocuments, pendingReturns, openTickets] = await Promise.all([
    db.order.count({ where: { status: { in: [...LIVE_ORDER_STATUSES] } } }),
    db.delivery.count({ where: { status: { in: [...ACTIVE_DELIVERY_STATUSES] } } }),
    db.delivery.count({ where: { agentId: null, method: "MANUAL", status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } } }),
    db.sellerDocument.count({ where: { status: "PENDING" } }),
    db.returnRequest.count({ where: { status: "REQUESTED" } }),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  return { liveOrders, activeDeliveries, unassignedDeliveries, pendingDocuments, pendingReturns, openTickets };
}

export interface ActivityFeedEntry {
  label: string;
  actorLabel: string;
  createdAt: Date;
  href: string;
}

/** Unions recent AuditLog entries with recent Dispute filings and Withdrawal requests into one sorted feed — a fuller picture than AuditLog alone. */
export async function getRecentActivityFeed(limit = 10): Promise<ActivityFeedEntry[]> {
  const [auditEntries, disputes, withdrawals] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { actor: true } }),
    db.dispute.findMany({ orderBy: { createdAt: "desc" }, take: limit, include: { buyer: true } }),
    db.withdrawal.findMany({ orderBy: { requestedAt: "desc" }, take: limit, include: { seller: true } }),
  ]);

  const entries: ActivityFeedEntry[] = [
    ...auditEntries.map((entry) => ({
      label: entry.action.replaceAll("_", " ").toLowerCase(),
      actorLabel: entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System",
      createdAt: entry.createdAt,
      href: "/admin/finance/audit-log",
    })),
    ...disputes.map((dispute) => ({
      label: "filed a dispute",
      actorLabel: `${dispute.buyer.firstName} ${dispute.buyer.lastName}`,
      createdAt: dispute.createdAt,
      href: `/admin/disputes/${dispute.id}`,
    })),
    ...withdrawals.map((withdrawal) => ({
      label: `requested a withdrawal (${Number(withdrawal.amount).toLocaleString("en-NG")})`,
      actorLabel: withdrawal.seller.storeName ?? withdrawal.seller.businessName ?? "Seller",
      createdAt: withdrawal.requestedAt,
      href: "/admin/withdrawals",
    })),
  ];

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
