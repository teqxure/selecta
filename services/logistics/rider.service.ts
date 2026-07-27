import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { Role } from "@/lib/constants/roles";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { createNotification } from "@/services/notifications/notification.service";
import type { RiderStatus } from "@/generated/prisma/enums";

export interface CreateRiderInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  vehicleType?: string | null;
  vehiclePlateNumber?: string | null;
}

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
          create: { vehicleType: input.vehicleType ?? null, vehiclePlateNumber: input.vehiclePlateNumber ?? null },
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
  return db.riderProfile.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } });
}

export function getRiderProfileByUserId(userId: string) {
  return db.riderProfile.findUnique({ where: { userId } });
}

export function listAvailableRiders() {
  return db.riderProfile.findMany({ where: { status: "AVAILABLE", isActive: true }, include: { user: true } });
}

/** Riders may only toggle themselves between OFFLINE/AVAILABLE/BREAK — ON_DELIVERY is system-set by dispatch assignment, never rider-set directly. */
export async function setRiderAvailability(userId: string, status: Extract<RiderStatus, "OFFLINE" | "AVAILABLE" | "BREAK">) {
  const profile = await db.riderProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError("Rider profile");
  if (profile.status === "ON_DELIVERY") throw new ValidationError("You can't change availability while on an active delivery");

  return db.riderProfile.update({ where: { userId }, data: { status } });
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

export async function notifyRiderAssigned(userId: string, deliveryId: string) {
  await createNotification(
    userId,
    "SYSTEM",
    "New delivery assigned",
    "You've been assigned a new delivery — check your dashboard for pickup details.",
    { actionUrl: `/rider/deliveries/${deliveryId}` },
  );
}
