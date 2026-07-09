import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { sendTemplatedEmail } from "@/services/notifications/email.service";
import { isEmailCategoryEnabled } from "@/services/notifications/preferences.service";
import { NOTIFICATION_EVENTS, type NotificationEventConfig, type NotificationEventName } from "@/services/notifications/events";

export interface NotifyInput {
  event: NotificationEventName;
  userId: string;
  title: string;
  message: string;
  /** Relative in-app link the notification-center row should point at, e.g. `/orders/abc123`. */
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  /** Values for the event's email template's `{{placeholders}}` — `customerName` is filled in automatically from the recipient if not given. */
  emailVariables?: Record<string, string>;
}

/**
 * The one place application code goes to notify a user of something —
 * "emit event, let the engine handle delivery" instead of features each
 * deciding for themselves whether/how to email someone. Always records
 * the in-app `Notification` row (that write is expected to succeed, same
 * as before this engine existed); email is best-effort on top of that —
 * gated by the event's category and the recipient's preferences (security
 * events bypass preferences entirely), and never able to throw back into
 * the caller (see sendEmail's own error handling).
 */
export async function notify(input: NotifyInput): Promise<void> {
  const config = NOTIFICATION_EVENTS[input.event] as NotificationEventConfig;

  await createNotification(input.userId, config.notificationType, input.title, input.message, {
    ...input.metadata,
    event: input.event,
    actionUrl: input.actionUrl,
  });

  if (!config.emailTemplateKey) return;

  const shouldEmail = await isEmailCategoryEnabled(input.userId, config.category);
  if (!shouldEmail) return;

  const user = await db.user.findUnique({ where: { id: input.userId }, select: { email: true, firstName: true } });
  if (!user) return;

  await sendTemplatedEmail(
    user.email,
    config.emailTemplateKey,
    { customerName: user.firstName, ...input.emailVariables },
    { userId: input.userId },
  );
}

/** For events with no single recipient user row yet (e.g. admin alerts fanned out to every active Super Admin) — same engine, explicit recipient list. */
export async function notifyMany(recipientUserIds: string[], input: Omit<NotifyInput, "userId">): Promise<void> {
  await Promise.all(recipientUserIds.map((userId) => notify({ ...input, userId })));
}
