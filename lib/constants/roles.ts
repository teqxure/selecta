import { Role } from "@/generated/prisma/enums";
import { UserStatus } from "@/generated/prisma/enums";
import { ROUTES } from "@/lib/constants/routes";

export { Role, UserStatus };

/** Human-readable labels for UI display. */
export const ROLE_LABELS: Record<Role, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  AGENT: "Delivery Agent",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
};

/**
 * Roles permitted to access each protected route prefix. Checked by
 * `proxy.ts` and by `requireRole` in server actions/route handlers — keep
 * both checks in sync with this table.
 */
export const ROUTE_ROLE_ACCESS: Record<string, Role[]> = {
  "/seller": [Role.SELLER, Role.ADMIN, Role.SUPER_ADMIN],
  "/admin": [Role.ADMIN, Role.SUPER_ADMIN],
};

/**
 * Where a login/registration redirects a role by default. The seller case
 * is refined further at login time (incomplete onboarding wins over this).
 */
export const ROLE_HOME_ROUTE: Record<Role, string> = {
  BUYER: ROUTES.home,
  SELLER: ROUTES.seller.dashboard,
  AGENT: ROUTES.home,
  ADMIN: ROUTES.admin.root,
  SUPER_ADMIN: ROUTES.admin.root,
};
