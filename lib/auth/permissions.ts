import { Role } from "@/lib/constants/roles";
import { SELLER_PERMISSIONS, BUYER_PERMISSIONS } from "@/lib/constants/permissions";

interface PermissionedUser {
  role: Role;
  permissions?: string[] | null;
}

/**
 * The full set of permission strings a user effectively holds right now.
 * SUPER_ADMIN always gets the wildcard — its authority isn't stored as a
 * grantable permission because it can't be revoked by anyone (there's
 * nothing above it to revoke it). ADMIN's set is whatever Super Admin
 * assigned to that specific user (`User.permissions`), not a role-wide
 * default — that's the entire point of the admin permission system.
 */
export function getEffectivePermissions(user: PermissionedUser): readonly string[] {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return ["*"];
    case Role.ADMIN:
      return user.permissions ?? [];
    case Role.SELLER:
      return SELLER_PERMISSIONS;
    case Role.BUYER:
      return BUYER_PERMISSIONS;
    default:
      return [];
  }
}

export function hasPermission(user: PermissionedUser, permission: string): boolean {
  const effective = getEffectivePermissions(user);
  return effective.includes("*") || effective.includes(permission);
}

export function hasAnyPermission(user: PermissionedUser, permissions: string[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
