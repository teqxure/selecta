"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createDeliveryZone, updateDeliveryZone, setDeliveryZoneActive } from "@/services/logistics/delivery-config.service";
import { ROUTES } from "@/lib/constants/routes";

function readZoneInput(formData: FormData) {
  const maxKm = String(formData.get("maxKm") || "");
  return {
    label: String(formData.get("label") || "").trim(),
    minKm: Number(formData.get("minKm")),
    maxKm: maxKm ? Number(maxKm) : null,
    sortOrder: Number(formData.get("sortOrder") || 0),
  };
}

export async function createDeliveryZoneAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  await createDeliveryZone(session.userId, readZoneInput(formData));
  revalidatePath(ROUTES.admin.logisticsZones);
}

export async function updateDeliveryZoneAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  await updateDeliveryZone(session.userId, id, readZoneInput(formData));
  revalidatePath(ROUTES.admin.logisticsZones);
}

export async function setDeliveryZoneActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  await setDeliveryZoneActive(session.userId, id, isActive);
  revalidatePath(ROUTES.admin.logisticsZones);
}
