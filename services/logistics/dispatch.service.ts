import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { notifyRiderAssigned } from "@/services/logistics/rider.service";

const DISPATCH_DELIVERY_INCLUDE = {
  order: { include: { buyer: true, items: { include: { product: { include: { seller: true } } } } } },
  agent: true,
} as const;

/** Deliveries with no in-house rider assigned yet, excluding ones already finished — the Dispatch Center's queue. */
export function listUnassignedDeliveries() {
  return db.delivery.findMany({
    where: { agentId: null, method: "MANUAL", status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } },
    include: DISPATCH_DELIVERY_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
}

export function listAssignedDeliveries() {
  return db.delivery.findMany({
    where: { agentId: { not: null }, status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } },
    include: DISPATCH_DELIVERY_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
}

export async function assignRiderToDelivery(adminId: string, deliveryId: string, riderUserId: string) {
  const rider = await db.riderProfile.findUnique({ where: { userId: riderUserId } });
  if (!rider || !rider.isActive) throw new ValidationError("This rider isn't available for assignment");

  return db.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundError("Delivery");

    const isReassignment = delivery.agentId !== null && delivery.agentId !== riderUserId;

    const updated = await tx.delivery.update({
      where: { id: deliveryId },
      data: { agentId: riderUserId, status: "RIDER_ASSIGNED" },
    });

    await tx.deliveryEvent.create({
      data: { deliveryId, status: "RIDER_ASSIGNED", note: isReassignment ? "Reassigned to a new rider" : "Rider assigned" },
    });

    await tx.riderProfile.update({ where: { userId: riderUserId }, data: { status: "ON_DELIVERY" } });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isReassignment ? "DELIVERY_REASSIGNED" : "DELIVERY_ASSIGNED",
        entityType: "Delivery",
        entityId: deliveryId,
        metadata: { riderUserId, previousAgentId: delivery.agentId },
      },
    });

    return updated;
  });
}

export async function unassignRider(adminId: string, deliveryId: string) {
  return db.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundError("Delivery");
    if (!delivery.agentId) throw new ValidationError("This delivery has no rider assigned");

    const updated = await tx.delivery.update({ where: { id: deliveryId }, data: { agentId: null, status: "READY_FOR_PICKUP" } });
    await tx.deliveryEvent.create({ data: { deliveryId, status: "READY_FOR_PICKUP", note: "Rider unassigned" } });

    const stillHasOtherActive = await tx.delivery.count({
      where: { agentId: delivery.agentId, status: { notIn: ["DELIVERED", "COMPLETED", "FAILED"] } },
    });
    if (stillHasOtherActive === 0) {
      await tx.riderProfile.update({ where: { userId: delivery.agentId }, data: { status: "AVAILABLE" } });
    }

    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_UNASSIGNED", entityType: "Delivery", entityId: deliveryId, metadata: { previousAgentId: delivery.agentId } },
    });

    return updated;
  });
}

export async function assignRiderToDeliveryAndNotify(adminId: string, deliveryId: string, riderUserId: string) {
  const delivery = await assignRiderToDelivery(adminId, deliveryId, riderUserId);
  await notifyRiderAssigned(riderUserId, deliveryId);
  return delivery;
}
