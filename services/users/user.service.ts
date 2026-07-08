import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createNotification } from "@/services/notifications/notification.service";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { PAGINATION } from "@/lib/constants/app";
import type { RegisterInput } from "@/lib/validators/auth";
import type { UpdateBuyerProfileInput } from "@/lib/validators/profile";
import type { GoogleProfile, GoogleRole } from "@/lib/auth/google";
import type { PaginatedResult } from "@/types";

export async function createUser(input: RegisterInput) {
  const [existingByEmail, existingByPhone] = await Promise.all([
    db.user.findUnique({ where: { email: input.email } }),
    db.user.findUnique({ where: { phone: input.phone } }),
  ]);
  if (existingByEmail) throw new ConflictError("An account with this email already exists");
  if (existingByPhone) throw new ConflictError("An account with this phone number already exists");

  const passwordHash = await hashPassword(input.password);
  const role = input.role;

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role,
      },
    });

    if (role === Role.SELLER) {
      await tx.sellerProfile.create({
        data: {
          userId: user.id,
          // Placeholder until onboarding step 2 — every seller starts a
          // profile at registration so the onboarding wizard always has a
          // row to update rather than branching on "does one exist yet".
          businessName: `${user.firstName} ${user.lastName}`,
          onboardingStep: 1,
        },
      });
    }

    await tx.userActivity.create({
      data: { userId: user.id, action: "ACCOUNT_CREATED", metadata: { role } },
    });

    return user;
  });
}

export async function getUserById(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User");
  return user;
}

export function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

/**
 * Google sign-in entry point. Resolution order: an existing Google-linked
 * account wins outright; otherwise a matching email links Google onto that
 * account (password login keeps working alongside it); otherwise a brand
 * new account is created with the role the user picked before starting the
 * OAuth redirect. Email is trusted as verified here because it comes from
 * Google's signed ID token, not user input.
 */
export async function findOrCreateGoogleUser(profile: GoogleProfile, intendedRole: GoogleRole) {
  const existingByGoogleId = await db.user.findUnique({ where: { googleId: profile.googleId } });
  if (existingByGoogleId) return existingByGoogleId;

  const existingByEmail = await db.user.findUnique({ where: { email: profile.email } });
  if (existingByEmail) {
    return db.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: profile.googleId,
        emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
        avatarUrl: existingByEmail.avatarUrl ?? profile.avatarUrl,
      },
    });
  }

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        firstName: profile.firstName || "Selecta",
        lastName: profile.lastName || "Member",
        avatarUrl: profile.avatarUrl,
        role: intendedRole,
        emailVerifiedAt: new Date(),
      },
    });

    if (intendedRole === Role.SELLER) {
      await tx.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: `${user.firstName} ${user.lastName}`,
          onboardingStep: 1,
        },
      });
    }

    await tx.userActivity.create({
      data: { userId: user.id, action: "ACCOUNT_CREATED", metadata: { role: intendedRole, via: "google" } },
    });

    return user;
  });
}

export async function updateBuyerProfile(userId: string, input: UpdateBuyerProfileInput) {
  return db.user.update({
    where: { id: userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone || undefined,
      city: sanitizeOptionalText(input.city),
      state: sanitizeOptionalText(input.state),
    },
  });
}

export async function updateUserStatus(userId: string, status: UserStatus, actorId: string) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data: { status } });
    await tx.auditLog.create({
      data: { actorId, action: "USER_STATUS_CHANGED", entityType: "User", entityId: userId, metadata: { status } },
    });
    return user;
  });
}

/**
 * Full role reassignment — Super Admin's "give this account any role,
 * including Super Admin itself" lever. Deliberately separate from (and far
 * less guarded than) admin-management.service.ts, which only ever touches
 * ADMIN accounts; this function is the one place in the codebase allowed
 * to promote into, or demote out of, SUPER_ADMIN. Two hard rules keep that
 * power from being a footgun: an actor can never change their own role
 * (no accidental or malicious self-lockout/self-escalation from this
 * surface), and the last active Super Admin can never be demoted (the
 * platform can't be left without one).
 */
export async function changeUserRole(actorId: string, targetUserId: string, newRole: Role, ipAddress?: string) {
  if (actorId === targetUserId) throw new ForbiddenError("You cannot change your own role");

  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError("User");
  if (target.role === newRole) return target;

  if (target.role === Role.SUPER_ADMIN) {
    const remainingSuperAdmins = await db.user.count({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, id: { not: targetUserId } },
    });
    if (remainingSuperAdmins === 0) {
      throw new ForbiddenError("At least one active Super Admin must remain — promote another account first");
    }
  }

  const previousRole = target.role;

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: targetUserId },
      // Permissions are meaningless (and dangerous to leave stale) outside
      // ADMIN — reset on every real role change; Super Admin grants fresh
      // ADMIN permissions afterward via /admin/admins if newRole is ADMIN.
      data: { role: newRole, permissions: [] },
    });

    if (newRole === Role.SELLER) {
      const existingSellerProfile = await tx.sellerProfile.findUnique({ where: { userId: user.id } });
      if (!existingSellerProfile) {
        await tx.sellerProfile.create({
          data: { userId: user.id, businessName: `${user.firstName} ${user.lastName}`, onboardingStep: 1 },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: targetUserId,
        metadata: { fromRole: previousRole, toRole: newRole },
        ipAddress,
      },
    });

    return user;
  });

  await createNotification(
    updated.id,
    "SYSTEM",
    "Your account role changed",
    `Your Selecta account role changed from ${previousRole} to ${newRole}.`,
    { fromRole: previousRole, toRole: newRole },
  );

  // A Super-Admin-tier transition (either direction) is the highest-stakes
  // change this function can make — surface it to every other active
  // Super Admin too, so it can never happen unnoticed even by them.
  if (previousRole === Role.SUPER_ADMIN || newRole === Role.SUPER_ADMIN) {
    const otherSuperAdmins = await db.user.findMany({
      where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, id: { notIn: [actorId, targetUserId] } },
      select: { id: true },
    });
    await Promise.all(
      otherSuperAdmins.map((admin) =>
        createNotification(
          admin.id,
          "SYSTEM",
          "Super Admin role change",
          `${updated.firstName} ${updated.lastName} (${updated.email}) changed from ${previousRole} to ${newRole}.`,
          { targetUserId, fromRole: previousRole, toRole: newRole, actorId },
        ),
      ),
    );
  }

  return updated;
}

export function recordLoginHistory(
  userId: string,
  success: boolean,
  options?: { reason?: string; ipAddress?: string; userAgent?: string },
) {
  return db.loginHistory.create({
    data: {
      userId,
      success,
      reason: options?.reason,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    },
  });
}

export function recordUserActivity(userId: string, action: string, metadata?: Record<string, unknown>) {
  return db.userActivity.create({ data: { userId, action, metadata: metadata as object } });
}

type UserRecord = Awaited<ReturnType<typeof db.user.findMany>>[number];

export async function listUsers(page = 1, pageSize = PAGINATION.defaultPageSize): Promise<PaginatedResult<UserRecord>> {
  const [items, totalCount] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count(),
  ]);

  return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}
