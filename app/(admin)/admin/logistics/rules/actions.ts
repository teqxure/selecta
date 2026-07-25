"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateDeliveryRule, createDeliveryHoliday, deleteDeliveryHoliday } from "@/services/logistics/delivery-config.service";
import { ROUTES } from "@/lib/constants/routes";

export async function updateDeliveryRuleAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  await updateDeliveryRule(session.userId, {
    pickupRadiusKm: Number(formData.get("pickupRadiusKm")),
    sameDayRadiusKm: Number(formData.get("sameDayRadiusKm")),
    sameDayCutoffHour: Number(formData.get("sameDayCutoffHour")),
    maxDeliveryDistanceKm: Number(formData.get("maxDeliveryDistanceKm")),
    expressAvailable: formData.get("expressAvailable") === "on",
    expressSurcharge: Number(formData.get("expressSurcharge") || 0),
    emergencyDisableAll: formData.get("emergencyDisableAll") === "on",
    emergencyDisableReason: String(formData.get("emergencyDisableReason") || "") || null,
  });
  revalidatePath(ROUTES.admin.logisticsRules);
}

export async function createDeliveryHolidayAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const date = String(formData.get("date") || "");
  if (!date) return;

  await createDeliveryHoliday(session.userId, {
    date: new Date(date),
    label: String(formData.get("label") || "").trim(),
    disablesSameDay: formData.get("disablesSameDay") === "on",
    disablesAll: formData.get("disablesAll") === "on",
  });
  revalidatePath(ROUTES.admin.logisticsRules);
}

export async function deleteDeliveryHolidayAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  await deleteDeliveryHoliday(session.userId, id);
  revalidatePath(ROUTES.admin.logisticsRules);
}
