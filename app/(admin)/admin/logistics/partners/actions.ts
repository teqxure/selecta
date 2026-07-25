"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createLogisticsPartner, updateLogisticsPartner, setLogisticsPartnerActive } from "@/services/logistics/delivery-config.service";
import { ROUTES } from "@/lib/constants/routes";

function readPartnerInput(formData: FormData) {
  const coverageCities = String(formData.get("coverageCities") || "")
    .split(",")
    .map((city) => city.trim())
    .filter(Boolean);
  const estimatedMinutes = String(formData.get("estimatedMinutes") || "");

  return {
    name: String(formData.get("name") || "").trim(),
    logoUrl: String(formData.get("logoUrl") || "") || null,
    coverageCities,
    pricingModel: String(formData.get("pricingModel") || "") || null,
    estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
    contactPhone: String(formData.get("contactPhone") || "") || null,
    contactEmail: String(formData.get("contactEmail") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  };
}

export async function createLogisticsPartnerAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  await createLogisticsPartner(session.userId, readPartnerInput(formData));
  revalidatePath(ROUTES.admin.logisticsPartners);
}

export async function updateLogisticsPartnerAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  await updateLogisticsPartner(session.userId, id, readPartnerInput(formData));
  revalidatePath(ROUTES.admin.logisticsPartners);
}

export async function setLogisticsPartnerActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  await setLogisticsPartnerActive(session.userId, id, isActive);
  revalidatePath(ROUTES.admin.logisticsPartners);
}
