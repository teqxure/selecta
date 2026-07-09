import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
import { detectContactSharingAttempt, CONTACT_SAFETY_WARNING, getViolationCount } from "@/services/messaging/contact-safety.service";
import { ROUTES } from "@/lib/constants/routes";
import type { ConversationType } from "@/generated/prisma/enums";

export interface StartConversationInput {
  type?: ConversationType;
  productId?: string;
  orderId?: string;
  disputeId?: string;
}

/**
 * Finds (or creates) the conversation for this exact context — a general
 * store inquiry (no product/order/dispute) is a distinct thread from a
 * per-product/order/dispute one, matched here at the application layer:
 * Postgres treats NULL columns as always-distinct, so a DB unique
 * constraint can't express "same product" vs "no product" matching.
 */
export async function getOrCreateConversation(buyerId: string, sellerProfileId: string, input: StartConversationInput = {}) {
  const type = input.type ?? "PRODUCT_INQUIRY";
  const existing = await db.conversation.findFirst({
    where: {
      buyerId,
      sellerProfileId,
      type,
      productId: input.productId ?? null,
      orderId: input.orderId ?? null,
      disputeId: input.disputeId ?? null,
    },
  });
  if (existing) return existing;

  return db.conversation.create({
    data: {
      buyerId,
      sellerProfileId,
      type,
      productId: input.productId,
      orderId: input.orderId,
      disputeId: input.disputeId,
    },
  });
}

async function getConversationForParticipant(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sellerProfile: true, product: { select: { id: true, title: true } } },
  });
  if (!conversation) throw new NotFoundError("Conversation");

  const isBuyer = conversation.buyerId === userId;
  const isSeller = conversation.sellerProfile.userId === userId;
  if (!isBuyer && !isSeller) throw new ForbiddenError("You don't have access to this conversation");

  return conversation;
}

export interface SendMessageResult {
  message: Awaited<ReturnType<typeof db.message.create>>;
  warning: string | null;
}

/**
 * Never blocks a legitimate message over a contact-safety match — it still
 * sends, flags for the trust system, and returns a soft warning for the UI
 * to show. Only a Super Admin-set `messagingRestrictedAt` actually blocks
 * sending.
 */
export async function sendMessage(conversationId: string, senderId: string, body: string, imageUrl?: string): Promise<SendMessageResult> {
  const trimmed = sanitizeText(body);
  if (!trimmed && !imageUrl) throw new ValidationError("Message can't be empty");

  const sender = await db.user.findUniqueOrThrow({ where: { id: senderId }, select: { messagingRestrictedAt: true } });
  if (sender.messagingRestrictedAt) {
    throw new ForbiddenError("Your messaging privileges have been restricted — contact support for help.");
  }

  const conversation = await getConversationForParticipant(conversationId, senderId);
  const isSenderBuyer = conversation.buyerId === senderId;
  const recipientUserId = isSenderBuyer ? conversation.sellerProfile.userId : conversation.buyerId;
  const recipientActionUrl = isSenderBuyer ? ROUTES.seller.message(conversationId) : ROUTES.message(conversationId);

  const safetyMatch = trimmed ? detectContactSharingAttempt(trimmed) : null;

  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId, body: trimmed, imageUrl } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);

  if (safetyMatch) {
    await db.messageFlag.create({
      data: { messageId: message.id, conversationId, userId: senderId, flagType: safetyMatch.flagType, matchedSnippet: safetyMatch.matchedSnippet },
    });

    const violationCount = await getViolationCount(senderId);
    if (violationCount >= 3) {
      const sender2 = await db.user.findUniqueOrThrow({ where: { id: senderId }, select: { email: true, firstName: true, lastName: true } });
      await alertAdmins(
        "Repeated contact-sharing attempts",
        `${sender2.firstName} ${sender2.lastName} (${sender2.email}) has triggered ${violationCount} contact-safety flags in the last 90 days.`,
        { actionUrl: ROUTES.admin.trustDashboard, metadata: { userId: senderId, violationCount } },
      );
    }
  }

  await notify({
    event: "NEW_MESSAGE",
    userId: recipientUserId,
    title: conversation.product ? `New message about ${conversation.product.title}` : "New message",
    message: trimmed ? trimmed.slice(0, 120) : "Sent a photo",
    actionUrl: recipientActionUrl,
  });

  return { message, warning: safetyMatch ? CONTACT_SAFETY_WARNING : null };
}

export async function listMessages(conversationId: string, userId: string) {
  await getConversationForParticipant(conversationId, userId);
  return db.message.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" }, include: { sender: true } });
}

export async function markConversationRead(conversationId: string, userId: string) {
  await getConversationForParticipant(conversationId, userId);
  await db.message.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

export interface ConversationListFilters {
  /** Only conversations with at least one unread message not sent by `viewerUserId`. */
  unreadOnly?: boolean;
  archived?: boolean;
  q?: string;
}

export function listConversationsForSeller(sellerProfileId: string, sellerUserId: string, filters: ConversationListFilters = {}) {
  return db.conversation.findMany({
    where: {
      sellerProfileId,
      isArchivedBySeller: filters.archived ?? false,
      ...(filters.unreadOnly && { messages: { some: { senderId: { not: sellerUserId }, readAt: null } } }),
      ...(filters.q && {
        buyer: { OR: [{ firstName: { contains: filters.q, mode: "insensitive" } }, { lastName: { contains: filters.q, mode: "insensitive" } }] },
      }),
    },
    include: { buyer: true, product: { select: { title: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });
}

export function listConversationsForBuyer(buyerId: string, filters: ConversationListFilters = {}) {
  return db.conversation.findMany({
    where: {
      buyerId,
      isArchivedByBuyer: filters.archived ?? false,
      ...(filters.unreadOnly && { messages: { some: { senderId: { not: buyerId }, readAt: null } } }),
      ...(filters.q && {
        sellerProfile: { OR: [{ storeName: { contains: filters.q, mode: "insensitive" } }, { businessName: { contains: filters.q, mode: "insensitive" } }] },
      }),
    },
    include: { sellerProfile: true, product: { select: { title: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });
}

/** Messages waiting on this seller's reply — i.e. sent by the buyer, not yet read. */
export function getUnreadCountForSeller(sellerProfileId: string, sellerUserId: string) {
  return db.message.count({
    where: {
      conversation: { sellerProfileId },
      senderId: { not: sellerUserId },
      readAt: null,
    },
  });
}

export function getUnreadCountForBuyer(buyerId: string) {
  return db.message.count({
    where: {
      conversation: { buyerId },
      senderId: { not: buyerId },
      readAt: null,
    },
  });
}

export async function setConversationArchived(conversationId: string, userId: string, archived: boolean) {
  const conversation = await getConversationForParticipant(conversationId, userId);
  const isBuyer = conversation.buyerId === userId;
  return db.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { isArchivedByBuyer: archived } : { isArchivedBySeller: archived },
  });
}

export async function reportConversation(conversationId: string, userId: string, reason: string) {
  await getConversationForParticipant(conversationId, userId);
  const trimmedReason = sanitizeText(reason);
  if (!trimmedReason) throw new ValidationError("Tell us what happened before reporting.");

  const conversation = await db.conversation.update({
    where: { id: conversationId },
    data: { isReported: true, reportedAt: new Date(), reportReason: trimmedReason },
  });

  await alertAdmins("Conversation reported", `A user reported a conversation: "${trimmedReason.slice(0, 200)}"`, {
    actionUrl: `${ROUTES.admin.trustDashboard}?conversationId=${conversationId}`,
    metadata: { conversationId },
  });

  return conversation;
}

/**
 * Admin support access — the caller must already hold `support.messages`
 * (checked by the caller via `requirePermission`); this always writes an
 * audit log entry, per Phase 13's "admin message access must require
 * permission and create audit logs."
 */
export async function getConversationForAdmin(conversationId: string, adminId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      buyer: true,
      sellerProfile: { include: { user: true } },
      product: { select: { title: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true, flag: true } },
    },
  });
  if (!conversation) throw new NotFoundError("Conversation");

  await db.auditLog.create({
    data: { actorId: adminId, action: "ADMIN_VIEWED_CONVERSATION", entityType: "Conversation", entityId: conversationId },
  });

  return conversation;
}
