import type { NotificationType } from "@/generated/prisma/enums";

/** Which `User.preferences.notifications` toggle gates email for this event. "security" is never gated — it always sends regardless of preference. */
export type NotificationCategory = "orderUpdates" | "sellerUpdates" | "marketing" | "security" | "admin";

export interface NotificationEventConfig {
  /** The coarse bucket the in-app `Notification` row is filed under. */
  notificationType: NotificationType;
  category: NotificationCategory;
  /** Key into DEFAULT_EMAIL_TEMPLATES / EmailTemplate — omit for events that are in-app only. */
  emailTemplateKey?: string;
}

/**
 * The single source of truth for "what kind of thing is this, and does it
 * warrant an email" — every call to `notify()` names one of these. Adding
 * a new event means adding one line here, not touching the dispatcher.
 */
export const NOTIFICATION_EVENTS = {
  USER_REGISTERED: { notificationType: "SYSTEM", category: "marketing", emailTemplateKey: "welcome" },
  SELLER_APPROVED: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "seller_approved" },
  SELLER_REJECTED: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "seller_rejected" },
  ORDER_CREATED: { notificationType: "ORDER", category: "orderUpdates", emailTemplateKey: "order_confirmation" },
  ORDER_PAID: { notificationType: "PAYMENT", category: "orderUpdates", emailTemplateKey: "payment_receipt" },
  ORDER_SHIPPED: { notificationType: "DELIVERY", category: "orderUpdates", emailTemplateKey: "order_shipped" },
  ORDER_DELIVERED: { notificationType: "DELIVERY", category: "orderUpdates", emailTemplateKey: "order_delivered" },
  ORDER_COMPLETED: { notificationType: "ORDER", category: "orderUpdates", emailTemplateKey: "order_completed" },
  /** Every other order-status transition (processing, ready-for-pickup, cancelled) — in-app only, no dedicated template. */
  ORDER_STATUS_CHANGED: { notificationType: "ORDER", category: "orderUpdates" },
  SELLER_NEW_ORDER: { notificationType: "ORDER", category: "sellerUpdates", emailTemplateKey: "seller_new_order" },
  DISPUTE_OPENED: { notificationType: "ORDER", category: "orderUpdates", emailTemplateKey: "dispute_update" },
  DISPUTE_RESOLVED: { notificationType: "ORDER", category: "orderUpdates", emailTemplateKey: "dispute_update" },
  REFUND_PROCESSED: { notificationType: "PAYMENT", category: "orderUpdates", emailTemplateKey: "refund_processed" },
  WITHDRAWAL_REQUESTED: { notificationType: "PAYMENT", category: "sellerUpdates", emailTemplateKey: "withdrawal_update" },
  WITHDRAWAL_APPROVED: { notificationType: "PAYMENT", category: "sellerUpdates", emailTemplateKey: "withdrawal_update" },
  WITHDRAWAL_REJECTED: { notificationType: "PAYMENT", category: "sellerUpdates", emailTemplateKey: "withdrawal_update" },
  SECURITY_ALERT: { notificationType: "SYSTEM", category: "security", emailTemplateKey: "security_alert" },
  ADMIN_ALERT: { notificationType: "SYSTEM", category: "admin", emailTemplateKey: "admin_alert" },
  SUBSCRIPTION_STARTED: { notificationType: "PAYMENT", category: "sellerUpdates", emailTemplateKey: "subscription_started" },
  SUBSCRIPTION_EXPIRING: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "subscription_expiring" },
  SUBSCRIPTION_EXPIRED: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "subscription_expired" },
  BOOST_STARTED: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "boost_started" },
  BOOST_COMPLETED: { notificationType: "SYSTEM", category: "sellerUpdates", emailTemplateKey: "boost_completed" },
  BOOST_PERFORMANCE_REPORT: { notificationType: "SYSTEM", category: "sellerUpdates" },
  SELLER_WEEKLY_REPORT: { notificationType: "SYSTEM", category: "sellerUpdates" },
  SELLER_MONTHLY_REPORT: { notificationType: "SYSTEM", category: "sellerUpdates" },
} as const satisfies Record<string, NotificationEventConfig>;

export type NotificationEventName = keyof typeof NOTIFICATION_EVENTS;
