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

export function markAsRead(id: string) {
  return db.notification.update({ where: { id }, data: { isRead: true } });
}
