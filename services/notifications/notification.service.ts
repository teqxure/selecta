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

export function listNotifications(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/** Scoped to `{ id, userId }` so marking someone else's notification read by guessing an id is a no-op. */
export async function markAsRead(id: string, userId: string) {
  await db.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  await db.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

export function getUnreadNotificationCount(userId: string) {
  return db.notification.count({ where: { userId, isRead: false } });
}
