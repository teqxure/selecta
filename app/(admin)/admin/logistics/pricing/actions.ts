"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { upsertCityDeliveryPricing, setCityDeliveryPricingActive } from "@/services/logistics/delivery-config.service";
import { ROUTES } from "@/lib/constants/routes";

export async function upsertCityDeliveryPricingAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const city = String(formData.get("city") || "").trim() || null;

  await upsertCityDeliveryPricing(session.userId, {
    city,
    zoneId: String(formData.get("zoneId")),
    price: Number(formData.get("price")),
    currency: String(formData.get("currency") || "NGN"),
  });
  revalidatePath(ROUTES.admin.logisticsPricing);
}

export async function setCityDeliveryPricingActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  await setCityDeliveryPricingActive(session.userId, id, isActive);
  revalidatePath(ROUTES.admin.logisticsPricing);
}
