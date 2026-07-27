/**
 * Permissions Super Admin can grant to an ADMIN individually — each one
 * gates a specific slice of the admin surface (each admin page/action
 * calls `requirePermission()` with the relevant string below). SUPER_ADMIN
 * never needs any of these listed explicitly — it holds "*".
 */
export const ADMIN_PERMISSIONS = [
  "users.manage",
  "vendors.manage",
  "vendors.verify",
  "products.moderate",
  "orders.manage",
  "disputes.handle",
  "reports.view",
  "content.manage",
  "payouts.manage",
  "support.messages",
  // Selecta HQ Permission Engine additions — new UPPER_SNAKE style for
  // genuinely new capabilities added in this phase; the dot-notation
  // strings above are untouched (renaming them would break every existing
  // grant already stored in User.permissions).
  "VIEW_FINANCE",
  "MANAGE_PRODUCTS",
  "VERIFY_DOCUMENTS",
  "APPROVE_REFUNDS",
  "ASSIGN_RIDERS",
  "MANAGE_LOGISTICS",
  "VIEW_ANALYTICS",
  "EDIT_PLATFORM_SETTINGS",
  "CREATE_PROMOTIONS",
  "VIEW_ESCROW",
  "MANAGE_PAYMENT_PROVIDERS",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  "users.manage": "Manage users (view accounts, change status)",
  "vendors.manage": "Manage vendors (suspend/reinstate stores, assign agents)",
  "vendors.verify": "Verify vendor onboarding submissions",
  "products.moderate": "Moderate product listings (approve/reject/remove)",
  "orders.manage": "Manage orders (view all orders, override status)",
  "disputes.handle": "Handle buyer/seller disputes",
  "reports.view": "View finance & platform reports",
  "content.manage": "Manage categories & platform content",
  "payouts.manage": "Review and approve seller withdrawal requests",
  "support.messages": "View buyer/seller conversations for support and trust review",
  VIEW_FINANCE: "View Finance Center (escrow, settlements, revenue reports)",
  MANAGE_PRODUCTS: "Manage products, categories, coupons, collections & campaigns",
  VERIFY_DOCUMENTS: "Review Compliance Center document submissions",
  APPROVE_REFUNDS: "Approve/reject returns and refund outcomes",
  ASSIGN_RIDERS: "Assign/reassign riders in the Dispatch Center",
  MANAGE_LOGISTICS: "Manage delivery zones, pricing, partners & rules",
  VIEW_ANALYTICS: "View Intelligence Center analytics",
  EDIT_PLATFORM_SETTINGS: "Edit System Settings",
  CREATE_PROMOTIONS: "Create coupons, collections & marketing campaigns",
  VIEW_ESCROW: "View escrow balances and ledger detail",
  MANAGE_PAYMENT_PROVIDERS: "Manage payment provider integrations",
};

/**
 * Fixed, non-editable permission sets for BUYER/SELLER — unlike ADMIN,
 * these aren't individually grantable per user; every seller gets the same
 * set, every buyer gets the same set. Named consistently with ADMIN's
 * dot-notation so `hasPermission()` works uniformly across every role.
 */
export const SELLER_PERMISSIONS = [
  "products.create",
  "products.update.own",
  "products.delete.own",
  "orders.read.own",
  "orders.update.own",
  "finance.read.own",
  "payouts.request.own",
  "profile.update.own",
  "messages.read.own",
] as const;

export const BUYER_PERMISSIONS = [
  "orders.read.own",
  "orders.create",
  "profile.update.own",
  "cart.manage.own",
  "wishlist.manage.own",
  "messages.read.own",
] as const;
