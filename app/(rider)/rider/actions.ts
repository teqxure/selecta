"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { setRiderAvailability, updateRiderLocation } from "@/services/logistics/rider.service";
import { advanceDeliveryStatusByRider, confirmDeliveryWithProof, type ProofOfDeliveryInput } from "@/services/logistics/delivery.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";
import type { DeliveryStatus, ProofMethod } from "@/generated/prisma/enums";

export interface RiderActionState {
  error?: string;
}

export async function setRiderAvailabilityAction(formData: FormData) {
  const session = await requireRole(Role.RIDER);
  const status = String(formData.get("status")) as "OFFLINE" | "AVAILABLE" | "BREAK";

  await setRiderAvailability(session.userId, status);
  revalidatePath(ROUTES.rider.dashboard);
}

export async function updateRiderLocationAction(latitude: number, longitude: number) {
  const session = await requireRole(Role.RIDER);
  await updateRiderLocation(session.userId, latitude, longitude);
}

export async function advanceDeliveryStatusAction(formData: FormData) {
  const session = await requireRole(Role.RIDER);
  const deliveryId = String(formData.get("deliveryId"));
  const nextStatus = String(formData.get("nextStatus")) as DeliveryStatus;

  await advanceDeliveryStatusByRider(session.userId, deliveryId, nextStatus);
  revalidatePath(ROUTES.rider.delivery(deliveryId));
  revalidatePath(ROUTES.rider.dashboard);
}

export async function confirmDeliveryAction(_prevState: RiderActionState, formData: FormData): Promise<RiderActionState> {
  const session = await requireRole(Role.RIDER);
  const deliveryId = String(formData.get("deliveryId"));
  const method = String(formData.get("method")) as ProofMethod;

  const proof: ProofOfDeliveryInput = {
    method,
    pin: String(formData.get("pin") || "") || undefined,
    photoUrl: String(formData.get("photoUrl") || "") || undefined,
    signatureUrl: String(formData.get("signatureUrl") || "") || undefined,
    notes: String(formData.get("notes") || "") || undefined,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : undefined,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : undefined,
  };

  try {
    await confirmDeliveryWithProof(session.userId, deliveryId, proof);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.rider.delivery(deliveryId));
  revalidatePath(ROUTES.rider.dashboard);
  return {};
}
