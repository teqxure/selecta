export interface EmailTemplateDefault {
  label: string;
  subject: string;
  bodyHtml: string;
}

/**
 * The built-in copy for every templated email — used the moment a key is
 * needed, before Super Admin ever touches `/admin/notifications`. Editing
 * a template there creates a real `EmailTemplate` row that then takes
 * over for that key; these defaults never change once shipped, so a
 * template a Super Admin never opened still sends sensible copy.
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplateDefault> = {
  welcome: {
    label: "Welcome email",
    subject: "Welcome to Selecta, {{customerName}}!",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Welcome to Selecta — Africa's fashion discovery marketplace. No more bending, just selecting.</p><p>Start exploring quality fashion from verified sellers, or open your own store in minutes.</p>`,
  },
  order_confirmation: {
    label: "Order confirmation",
    subject: "Order {{orderId}} confirmed",
    bodyHtml: `<p>Hi {{customerName}},</p><p>We've received payment for order <strong>{{orderId}}</strong> ({{amount}}). Your seller is preparing it now — we'll email you again once it ships.</p>`,
  },
  payment_receipt: {
    label: "Payment receipt",
    subject: "Payment receipt — {{amount}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>This confirms your payment of <strong>{{amount}}</strong> for order {{orderId}} was successful.</p>`,
  },
  order_shipped: {
    label: "Order shipped",
    subject: "Your order {{orderId}} has shipped",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Good news — order <strong>{{orderId}}</strong> is on its way to you.</p>`,
  },
  order_delivered: {
    label: "Order delivered",
    subject: "Order {{orderId}} delivered",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Order <strong>{{orderId}}</strong> has been marked as delivered. Enjoy your new piece! Once you've had a chance to check it over, we'd love a review.</p>`,
  },
  order_completed: {
    label: "Order completed",
    subject: "Order {{orderId}} complete",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Order <strong>{{orderId}}</strong> is now complete. Thank you for shopping on Selecta.</p>`,
  },
  seller_new_order: {
    label: "Seller: new order",
    subject: "New order for {{storeName}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>{{storeName}} just received a new order ({{orderId}}). Head to your seller dashboard to prepare it for pickup.</p>`,
  },
  seller_approved: {
    label: "Seller approved",
    subject: "Your store is verified!",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Congratulations — {{storeName}} has been verified. You can now list products on Selecta.</p>`,
  },
  seller_rejected: {
    label: "Seller verification rejected",
    subject: "Your verification needs another look",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your verification for {{storeName}} wasn't approved this time. Please review your documents and resubmit from your seller dashboard.</p>`,
  },
  withdrawal_update: {
    label: "Withdrawal update",
    subject: "Withdrawal of {{amount}} — {{status}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your withdrawal request of <strong>{{amount}}</strong> is now <strong>{{status}}</strong>.</p>`,
  },
  dispute_update: {
    label: "Dispute update",
    subject: "Update on your dispute for order {{orderId}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>There's an update on the dispute for order <strong>{{orderId}}</strong>: {{message}}</p>`,
  },
  refund_processed: {
    label: "Refund processed",
    subject: "Refund processed — {{amount}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>A refund of <strong>{{amount}}</strong> for order {{orderId}} has been processed back to you.</p>`,
  },
  security_alert: {
    label: "Security alert",
    subject: "Security alert on your Selecta account",
    bodyHtml: `<p>Hi {{customerName}},</p><p>{{message}}</p><p>If this wasn't you, please contact support immediately.</p>`,
  },
  admin_alert: {
    label: "Admin alert",
    subject: "Selecta HQ: {{alertTitle}}",
    bodyHtml: `<p>{{message}}</p>`,
  },
  subscription_started: {
    label: "Subscription started",
    subject: "Welcome to Selecta {{planName}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your <strong>{{planName}}</strong> subscription is now active. It renews on {{expiresAt}}.</p>`,
  },
  subscription_expiring: {
    label: "Subscription expiring soon",
    subject: "Your {{planName}} subscription expires soon",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your <strong>{{planName}}</strong> subscription expires on {{expiresAt}}. Renew from your Growth Center to keep your benefits.</p>`,
  },
  subscription_expired: {
    label: "Subscription expired",
    subject: "Your {{planName}} subscription has expired",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your <strong>{{planName}}</strong> subscription has expired and your account has moved to the free plan. Renew anytime from your Growth Center.</p>`,
  },
  boost_started: {
    label: "Boost campaign started",
    subject: "Your boost campaign for {{productTitle}} is live",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your boost campaign for <strong>{{productTitle}}</strong> is now active and will run until {{endDate}}.</p>`,
  },
  boost_completed: {
    label: "Boost campaign completed",
    subject: "Your boost campaign for {{productTitle}} has ended",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your boost campaign for <strong>{{productTitle}}</strong> has ended. Check your Marketing Center for the full performance report.</p>`,
  },
  offer_received: {
    label: "Offer received",
    subject: "New offer of {{amount}} on {{productTitle}}",
    bodyHtml: `<p>Hi {{customerName}},</p><p>You've received an offer of <strong>{{amount}}</strong> on <strong>{{productTitle}}</strong>. Reply in Messages to accept, reject, or counter.</p>`,
  },
  offer_accepted: {
    label: "Offer accepted",
    subject: "Your offer on {{productTitle}} was accepted",
    bodyHtml: `<p>Hi {{customerName}},</p><p>Your offer of <strong>{{amount}}</strong> on <strong>{{productTitle}}</strong> was accepted. Complete checkout to secure it.</p>`,
  },
  message_flagged: {
    label: "Message flagged for review",
    subject: "A conversation was flagged for review",
    bodyHtml: `<p>{{message}}</p>`,
  },
};
