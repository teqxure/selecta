import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";

/** Buyer starts (or resumes) a thread with a store — one conversation per buyer/seller pair. */
export async function getOrCreateConversation(buyerId: string, sellerProfileId: string) {
  return db.conversation.upsert({
    where: { buyerId_sellerProfileId: { buyerId, sellerProfileId } },
    create: { buyerId, sellerProfileId },
    update: {},
  });
}

async function getConversationForParticipant(conversationId: string, userId: string) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sellerProfile: true },
  });
  if (!conversation) throw new NotFoundError("Conversation");

  const isBuyer = conversation.buyerId === userId;
  const isSeller = conversation.sellerProfile.userId === userId;
  if (!isBuyer && !isSeller) throw new ForbiddenError("You don't have access to this conversation");

  return conversation;
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const trimmed = sanitizeText(body);
  if (!trimmed) throw new ValidationError("Message can't be empty");

  const conversation = await getConversationForParticipant(conversationId, senderId);
  const recipientUserId = conversation.buyerId === senderId ? conversation.sellerProfile.userId : conversation.buyerId;

  const [message] = await db.$transaction([
    db.message.create({ data: { conversationId, senderId, body: trimmed } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ]);

  await createNotification(recipientUserId, "MESSAGE", "New message", trimmed.slice(0, 120));

  return message;
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

export function listConversationsForSeller(sellerProfileId: string) {
  return db.conversation.findMany({
    where: { sellerProfileId },
    include: { buyer: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { lastMessageAt: "desc" },
  });
}

export function listConversationsForBuyer(buyerId: string) {
  return db.conversation.findMany({
    where: { buyerId },
    include: { sellerProfile: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
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
