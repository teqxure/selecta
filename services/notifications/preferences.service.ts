import "server-only";
import { db } from "@/lib/db";
import type { NotificationCategory } from "@/services/notifications/events";

export interface NotificationPreferences {
  orderUpdates: boolean;
  sellerUpdates: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  sellerUpdates: true,
  marketing: true,
};

/**
 * Reuses the `User.preferences` `Json?` column (present in the schema
 * since the very first migration, never previously used) rather than a
 * new table — namespaced under `notifications` in case unrelated
 * preferences ever land in that same column. Security alerts are
 * deliberately not a field here at all: there's nothing to toggle, so
 * there's no way to store "off" for them.
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const stored = (user?.preferences as { notifications?: Partial<NotificationPreferences> } | null)?.notifications;
  return { ...DEFAULT_PREFERENCES, ...stored };
}

export async function updateNotificationPreferences(userId: string, input: Partial<NotificationPreferences>) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const existingRaw = (user?.preferences as Record<string, unknown> | null) ?? {};
  const existingNotifications = (existingRaw.notifications as Partial<NotificationPreferences> | undefined) ?? {};

  const merged = { ...DEFAULT_PREFERENCES, ...existingNotifications, ...input };
  await db.user.update({
    where: { id: userId },
    data: { preferences: { ...existingRaw, notifications: merged } },
  });
  return merged;
}

/** Security is always on; every other category is gated by the user's stored preference. */
export async function isEmailCategoryEnabled(userId: string, category: NotificationCategory): Promise<boolean> {
  if (category === "security" || category === "admin") return true;
  const prefs = await getNotificationPreferences(userId);
  return prefs[category];
}
