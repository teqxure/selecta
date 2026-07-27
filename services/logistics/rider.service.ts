import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { Role } from "@/lib/constants/roles";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";
import { alertAdmins } from "@/services/notifications/admin-alerts.service";
import type { Prisma } from "@/generated/prisma/client";
import type { RiderStatus } from "@/generated/prisma/enums";
import type { RiderVehicleInput, RiderVerificationSubmissionInput } from "@/lib/validators/onboarding";
import { RIDER_VEHICLE_TYPES_REQUIRING_LICENSE } from "@/lib/validators/onboarding";

export interface CreateRiderInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  vehicleType?: string | null;
  vehiclePlateNumber?: string | null;
}

/**
 * Admin-created riders are already-vetted out-of-band by the admin who
 * filled this form — they're created already VERIFIED and with onboarding
 * marked complete, skipping the self-signup wizard entirely. Self-signups
 * (via /register) start PENDING and go through RiderVerification instead.
 */
export async function createRiderAccount(adminId: string, input: CreateRiderInput) {
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);

  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.RIDER,
        riderProfile: {
          create: {
            vehicleType: input.vehicleType ?? null,
            vehiclePlateNumber: input.vehiclePlateNumber ?? null,
            verificationStatus: "VERIFIED",
            onboardingStep: 4,
            onboardingCompletedAt: new Date(),
          },
        },
      },
      include: { riderProfile: true },
    });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "RIDER_CREATED", entityType: "User", entityId: user.id, metadata: { email: input.email } },
    });

    return user;
  });
}

export function listRiders() {
  return db.riderProfile.findMany({ include: { user: true, verification: true }, orderBy: { createdAt: "desc" } });
}

export async function getRiderProfileByUserId(userId: string) {
  const profile = await db.riderProfile.findUnique({ where: { userId }, include: { verification: true } });
  if (!profile) throw new NotFoundError("Rider profile");
  return profile;
}

/** Non-throwing variant for call sites (layouts, dashboards) where "no profile yet" is a valid state, not an error. */
export function findRiderProfileByUserId(userId: string) {
  return db.riderProfile.findUnique({ where: { userId }, include: { verification: true } });
}

async function assertOwnsRiderProfile(tx: Prisma.TransactionClient, riderProfileId: string, userId: string) {
  const profile = await tx.riderProfile.findFirst({ where: { id: riderProfileId, userId } });
  if (!profile) throw new NotFoundError("Rider profile");
  return profile;
}

export function listAvailableRiders() {
  return db.riderProfile.findMany({
    where: { status: "AVAILABLE", isActive: true, verificationStatus: "VERIFIED" },
    include: { user: true },
  });
}

/** Riders may only toggle themselves between OFFLINE/AVAILABLE/BREAK — ON_DELIVERY is system-set by dispatch assignment, never rider-set directly. */
export async function setRiderAvailability(userId: string, status: Extract<RiderStatus, "OFFLINE" | "AVAILABLE" | "BREAK">) {
  const profile = await db.riderProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Rider profile");
  if (profile.verificationStatus !== "VERIFIED") {
    throw new ValidationError("Your account is still under review — you can't go available yet");
  }
  if (profile.status === "ON_DELIVERY") throw new ValidationError("You can't change availability while on an active delivery");

  return db.riderProfile.update({ where: { userId }, data: { status } });
}

/** Onboarding step 1: confirm personal info collected at signup — mirrors completePersonalInfoStep for sellers. */
export async function completeRiderPersonalStep(
  userId: string,
  riderProfileId: string,
  input: { firstName: string; lastName: string; phone: string },
) {
  return db.$transaction(async (tx) => {
    await assertOwnsRiderProfile(tx, riderProfileId, userId);

    await tx.user.update({
      where: { id: userId },
      data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
    });

    return tx.riderProfile.update({ where: { id: riderProfileId }, data: { onboardingStep: 2 } });
  });
}

/** Onboarding step 2: vehicle info. */
export async function completeRiderVehicleStep(userId: string, riderProfileId: string, input: RiderVehicleInput) {
  return db.$transaction(async (tx) => {
    await assertOwnsRiderProfile(tx, riderProfileId, userId);

    return tx.riderProfile.update({
      where: { id: riderProfileId },
      data: {
        vehicleType: input.vehicleType,
        vehiclePlateNumber: input.vehiclePlateNumber || null,
        onboardingStep: 3,
      },
    });
  });
}

/** Post-onboarding settings update — same fields as the personal/vehicle onboarding steps, reused for a rider editing their own profile later. */
export async function updateRiderSettings(
  userId: string,
  riderProfileId: string,
  input: { firstName: string; lastName: string; phone: string; vehicleType: string; vehiclePlateNumber?: string },
) {
  return db.$transaction(async (tx) => {
    await assertOwnsRiderProfile(tx, riderProfileId, userId);

    await tx.user.update({
      where: { id: userId },
      data: { firstName: input.firstName, lastName: input.lastName, phone: input.phone },
    });

    return tx.riderProfile.update({
      where: { id: riderProfileId },
      data: { vehicleType: input.vehicleType, vehiclePlateNumber: input.vehiclePlateNumber || null },
    });
  });
}

/**
 * Onboarding step 3: verification documents — submission, not approval.
 * Unlike seller verification, there's no "skip" path: a rider physically
 * handles buyers' money and parcels, so verification is a hard gate, not
 * just a trust/discovery boost.
 */
export async function submitRiderVerification(userId: string, riderProfileId: string, input: RiderVerificationSubmissionInput) {
  const profile = await db.riderProfile.findFirst({ where: { id: riderProfileId, userId } });
  if (!profile) throw new NotFoundError("Rider profile");
  if (!profile.vehicleType) throw new ValidationError("Complete vehicle info first");

  if (RIDER_VEHICLE_TYPES_REQUIRING_LICENSE.has(profile.vehicleType as never) && !input.licenseDocumentUrl) {
    throw new ValidationError("A driving license is required for this vehicle type");
  }

  const result = await db.$transaction(async (tx) => {
    await tx.riderVerification.upsert({
      where: { riderProfileId },
      create: {
        riderProfileId,
        idDocumentUrl: input.idDocumentUrl,
        licenseDocumentUrl: input.licenseDocumentUrl || null,
        vehiclePhotoUrl: input.vehiclePhotoUrl,
        status: "PENDING",
      },
      update: {
        idDocumentUrl: input.idDocumentUrl,
        licenseDocumentUrl: input.licenseDocumentUrl || null,
        vehiclePhotoUrl: input.vehiclePhotoUrl,
        status: "PENDING",
        submittedAt: new Date(),
        reviewedAt: null,
        reviewNotes: null,
      },
    });

    const updated = await tx.riderProfile.update({
      where: { id: riderProfileId },
      data: { onboardingStep: 4, onboardingCompletedAt: new Date(), verificationStatus: "PENDING" },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "Verification submitted",
        message: "We've received your rider verification documents and will review them shortly.",
      },
    });

    return updated;
  });

  await alertAdmins("New rider verification submitted", "A new rider submitted verification documents for review.", {
    actionUrl: "/admin/logistics/riders",
    metadata: { riderProfileId },
  });

  return result;
}

async function reviewRiderVerification(
  riderProfileId: string,
  reviewerId: string,
  status: "VERIFIED" | "REJECTED",
  notes: string | undefined,
) {
  return db.$transaction(async (tx) => {
    const verification = await tx.riderVerification.findUnique({ where: { riderProfileId } });
    if (!verification) throw new NotFoundError("Rider verification");
    if (verification.status !== "PENDING") throw new ValidationError("This verification has already been reviewed");

    await tx.riderVerification.update({
      where: { riderProfileId },
      data: { status, reviewedById: reviewerId, reviewedAt: new Date(), reviewNotes: sanitizeOptionalText(notes) },
    });

    const profile = await tx.riderProfile.update({ where: { id: riderProfileId }, data: { verificationStatus: status } });

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: status === "VERIFIED" ? "RIDER_VERIFIED" : "RIDER_VERIFICATION_REJECTED",
        entityType: "RiderProfile",
        entityId: riderProfileId,
        metadata: notes ? { notes } : undefined,
      },
    });

    await tx.notification.create({
      data: {
        userId: profile.userId,
        type: "SYSTEM",
        title: status === "VERIFIED" ? "You're verified!" : "Verification needs changes",
        message:
          status === "VERIFIED"
            ? "Your rider account is verified — go available from your dashboard to start receiving deliveries."
            : `Your rider verification wasn't approved${notes ? `: ${notes}` : "."}`,
      },
    });

    return profile;
  });
}

export function approveRiderVerification(riderProfileId: string, reviewerId: string, notes?: string) {
  return reviewRiderVerification(riderProfileId, reviewerId, "VERIFIED", notes);
}

export function rejectRiderVerification(riderProfileId: string, reviewerId: string, notes?: string) {
  return reviewRiderVerification(riderProfileId, reviewerId, "REJECTED", notes);
}

export async function updateRiderLocation(userId: string, latitude: number, longitude: number) {
  return db.riderProfile.update({ where: { userId }, data: { latitude, longitude, locationUpdatedAt: new Date() } });
}

export async function setRiderActive(adminId: string, riderProfileId: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const profile = await tx.riderProfile.update({ where: { id: riderProfileId }, data: { isActive } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isActive ? "RIDER_ACTIVATED" : "RIDER_DEACTIVATED",
        entityType: "RiderProfile",
        entityId: riderProfileId,
      },
    });
    return profile;
  });
}

const DELIVERY_DETAIL_INCLUDE = {
  order: { include: { buyer: true, items: { include: { product: { include: { seller: true } } } } } },
} as const;

/** Deliveries currently assigned to this rider that aren't finished yet — the rider's active queue. */
export function getRiderActiveDeliveries(userId: string) {
  return db.delivery.findMany({
    where: { agentId: userId, status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } },
    include: DELIVERY_DETAIL_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export function getRiderDeliveryHistory(userId: string, take = 30) {
  return db.delivery.findMany({
    where: { agentId: userId, status: { in: ["DELIVERED", "COMPLETED", "FAILED"] } },
    include: DELIVERY_DETAIL_INCLUDE,
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export async function getRiderDeliveryById(userId: string, deliveryId: string) {
  const delivery = await db.delivery.findUnique({ where: { id: deliveryId }, include: DELIVERY_DETAIL_INCLUDE });
  if (!delivery) throw new NotFoundError("Delivery");
  if (delivery.agentId !== userId) throw new ForbiddenError("You aren't the assigned rider for this delivery");
  return delivery;
}

/** Reuses the same role-agnostic Wallet model sellers use — riders are just another userId keyed into it. */
export async function getRiderWallet(userId: string) {
  const wallet = await db.wallet.findUnique({ where: { userId } });
  return {
    available: Number(wallet?.balance ?? 0),
    withdrawn: Number(wallet?.withdrawnBalance ?? 0),
    lifetime: Number(wallet?.totalEarned ?? 0),
  };
}

/** Today's/this week's earnings and delivery counts — the rider dashboard's headline stats. */
export async function getRiderDashboardStats(userId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6); // rolling 7-day window, inclusive of today

  const [todayEarnings, weekEarnings, deliveriesToday, deliveriesThisWeek] = await Promise.all([
    db.ledgerEntry.aggregate({
      where: { userId, type: "RIDER_PAYOUT_EARNED", createdAt: { gte: startOfToday } },
      _sum: { amount: true },
    }),
    db.ledgerEntry.aggregate({
      where: { userId, type: "RIDER_PAYOUT_EARNED", createdAt: { gte: startOfWeek } },
      _sum: { amount: true },
    }),
    db.delivery.count({ where: { agentId: userId, status: { in: ["DELIVERED", "COMPLETED"] }, deliveredAt: { gte: startOfToday } } }),
    db.delivery.count({ where: { agentId: userId, status: { in: ["DELIVERED", "COMPLETED"] }, deliveredAt: { gte: startOfWeek } } }),
  ]);

  return {
    todayEarnings: Number(todayEarnings._sum.amount ?? 0),
    weekEarnings: Number(weekEarnings._sum.amount ?? 0),
    deliveriesToday,
    deliveriesThisWeek,
  };
}

export async function notifyRiderAssigned(userId: string, deliveryId: string) {
  await createNotification(
    userId,
    "SYSTEM",
    "New delivery assigned",
    "You've been assigned a new delivery — check your dashboard for pickup details.",
    { actionUrl: `/rider/deliveries/${deliveryId}` },
  );
}
