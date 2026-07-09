import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { findSellerProfileByUserId } from "@/services/sellers/seller.service";
import { recordUserActivity } from "@/services/users/user.service";

/**
 * "Switchable persona" model: `role` still means "which mode is active
 * right now" everywhere else in the app (session token, proxy.ts,
 * requireRole/requireActiveRole, permissions) — completely unchanged. What's
 * new is that a `SellerProfile` can now persist across a switch back to
 * BUYER, so `role` is no longer a one-way, permanent choice. Neither
 * function here touches `permissions` — BUYER/SELLER permission sets are
 * derived purely from `role` in lib/auth/permissions.ts, nothing is stored
 * per-user for them.
 */
export async function switchToSellerMode(userId: string): Promise<{ destination: string }> {
  const existing = await findSellerProfileByUserId(userId);

  if (existing?.onboardingCompletedAt) {
    await db.user.update({ where: { id: userId }, data: { role: Role.SELLER } });
    await recordUserActivity(userId, "ROLE_SWITCHED_TO_SELLER", { via: "self_service", resumed: false });
    return { destination: ROUTES.seller.dashboard };
  }

  await db.$transaction(async (tx) => {
    if (!existing) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      await tx.sellerProfile.create({
        data: { userId, businessName: `${user.firstName} ${user.lastName}`, onboardingStep: 1 },
      });
    }
    await tx.user.update({ where: { id: userId }, data: { role: Role.SELLER } });
  });
  await recordUserActivity(userId, "ROLE_SWITCHED_TO_SELLER", { via: "self_service", resumed: !!existing });

  return { destination: ROUTES.seller.onboarding.personal };
}

/** SellerProfile is left completely untouched — switching back to seller mode later (via switchToSellerMode) resumes exactly where it left off. */
export async function switchToBuyerMode(userId: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { role: Role.BUYER } });
  await recordUserActivity(userId, "ROLE_SWITCHED_TO_BUYER", { via: "self_service" });
}
