import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { Role, UserStatus } from "@/lib/constants/roles";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { PAGINATION } from "@/lib/constants/app";
import type { RegisterInput } from "@/lib/validators/auth";
import type { UpdateBuyerProfileInput } from "@/lib/validators/profile";
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
