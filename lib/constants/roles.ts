import { Role } from "@/generated/prisma/enums";

export { Role };

/** Human-readable labels for UI display. */
export const ROLE_LABELS: Record<Role, string> = {
  BUYER: "Buyer",
  SELLER: "Seller",
  AGENT: "Delivery Agent",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
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
