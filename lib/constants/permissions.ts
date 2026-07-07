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
