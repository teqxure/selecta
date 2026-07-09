import "server-only";
import { db } from "@/lib/db";
import type { NotificationType } from "@/generated/prisma/enums";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  metadata?: Record<string, unknown>,
) {
  return db.notification.create({
    data: { userId, type, title, message, metadata: metadata as object },
  });
}

export function listNotifications(userId: string, type?: NotificationType) {
  return db.notification.findMany({
    where: { userId, ...(type && { type }) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Scoped to `{ id, userId }` so marking someone else's notification read by guessing an id is a no-op. */
export async function markAsRead(id: string, userId: string) {
  await db.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

/** Scoped to `{ id, userId }` — same ownership-is-the-query pattern as markAsRead, so deleting someone else's row by guessing an id is a no-op, not a leak. */
export async function deleteNotification(id: string, userId: string) {
  await db.notification.deleteMany({ where: { id, userId } });
}

export async function markAllAsRead(userId: string) {
  await db.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export function getUnreadNotificationCount(userId: string) {
  return db.notification.count({ where: { userId, isRead: false } });
}
