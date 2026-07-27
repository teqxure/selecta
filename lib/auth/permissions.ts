import { Role } from "@/lib/constants/roles";
import { SELLER_PERMISSIONS, BUYER_PERMISSIONS } from "@/lib/constants/permissions";

interface PermissionedUser {
  role: Role;
  permissions?: string[] | null;
  /// Optional assigned Permission Engine role (StaffRole) — only meaningful
  /// for ADMIN. Union'd with the individually-granted `permissions` above,
  /// never a replacement for them.
  staffRole?: { permissions: { permission: string }[] } | null;
}

/**
 * The full set of permission strings a user effectively holds right now.
 * SUPER_ADMIN always gets the wildcard — its authority isn't stored as a
 * grantable permission because it can't be revoked by anyone (there's
 * nothing above it to revoke it). ADMIN's set is the union of whatever was
 * assigned individually (`User.permissions`) and whatever their assigned
 * StaffRole grants — either alone is enough to unlock a given permission.
 */
export function getEffectivePermissions(user: PermissionedUser): readonly string[] {
  switch (user.role) {
    case Role.SUPER_ADMIN:
      return ["*"];
    case Role.ADMIN: {
      const individual = user.permissions ?? [];
      const fromRole = user.staffRole?.permissions.map((p) => p.permission) ?? [];
      return [...new Set([...individual, ...fromRole])];
    }
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
