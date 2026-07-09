import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import { NotFoundError } from "@/lib/errors";

/**
 * Super Admin trust-review actions — every action here writes an audit log
 * entry (Phase 13) and reuses the existing account-status system for the
 * heaviest lever (suspension) rather than inventing a parallel one.
 */
export async function warnUser(adminId: string, targetUserId: string, note?: string) {
  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("User");

  await notify({
    event: "SECURITY_ALERT",
    userId: targetUserId,
    title: "Please review Selecta's community guidelines",
    message: note || "We've noticed activity in your messages that may violate our community guidelines. Keep conversations and payments on Selecta.",
  });

  await db.auditLog.create({
    data: { actorId: adminId, action: "USER_WARNED", entityType: "User", entityId: targetUserId, metadata: note ? { note } : undefined },
  });
}

export async function restrictMessaging(adminId: string, targetUserId: string) {
  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("User");

  await db.user.update({ where: { id: targetUserId }, data: { messagingRestrictedAt: new Date() } });

  await notify({
    event: "SECURITY_ALERT",
    userId: targetUserId,
    title: "Your messaging privileges have been restricted",
    message: "Your ability to send messages on Selecta has been restricted due to repeated policy violations. Contact support for help.",
  });

  await db.auditLog.create({
    data: { actorId: adminId, action: "MESSAGING_RESTRICTED", entityType: "User", entityId: targetUserId },
  });
}

export async function liftMessagingRestriction(adminId: string, targetUserId: string) {
  await db.user.update({ where: { id: targetUserId }, data: { messagingRestrictedAt: null } });
  await db.auditLog.create({
    data: { actorId: adminId, action: "MESSAGING_RESTRICTION_LIFTED", entityType: "User", entityId: targetUserId },
  });
}

export function listReportedConversations() {
  return db.conversation.findMany({
    where: { isReported: true },
    include: { buyer: true, sellerProfile: { include: { user: true } }, product: { select: { title: true } } },
    orderBy: { reportedAt: "desc" },
  });
}

/** Sellers with an unusually high dispute count relative to their transaction volume — a real ratio, not a raw count, so a high-volume seller isn't unfairly flagged. */
export async function listHighDisputeSellers(minDisputeRatio = 0.15, minDisputes = 2) {
  const sellers = await db.sellerProfile.findMany({
    where: { disputes: { some: {} } },
    select: {
      id: true,
      storeName: true,
      businessName: true,
      _count: { select: { disputes: true, transactions: true } },
    },
  });

  return sellers
    .filter((s) => s._count.disputes >= minDisputes && s._count.disputes / Math.max(1, s._count.transactions) >= minDisputeRatio)
    .map((s) => ({
      sellerId: s.id,
      storeName: s.storeName ?? s.businessName,
      disputeCount: s._count.disputes,
      transactionCount: s._count.transactions,
      disputeRatio: s._count.disputes / Math.max(1, s._count.transactions),
    }))
    .sort((a, b) => b.disputeRatio - a.disputeRatio);
}
