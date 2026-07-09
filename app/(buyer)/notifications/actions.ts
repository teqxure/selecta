"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { markAsRead, markAllAsRead, deleteNotification } from "@/services/notifications/notification.service";
import { ROUTES } from "@/lib/constants/routes";

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireAuth();
  await markAsRead(String(formData.get("notificationId")), session.userId);
  revalidatePath(ROUTES.notifications);
}

export async function markAllNotificationsReadAction() {
  const session = await requireAuth();
  await markAllAsRead(session.userId);
  revalidatePath(ROUTES.notifications);
}

export async function deleteNotificationAction(formData: FormData) {
  const session = await requireAuth();
  await deleteNotification(String(formData.get("notificationId")), session.userId);
  revalidatePath(ROUTES.notifications);
}
