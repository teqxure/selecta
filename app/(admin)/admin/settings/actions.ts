"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateSystemSettings } from "@/services/platform/system-settings.service";
import { ROUTES } from "@/lib/constants/routes";
import type { MarketplaceStatus } from "@/generated/prisma/enums";

export async function updateSystemSettingsAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  await updateSystemSettings(session.userId, {
    platformName: String(formData.get("platformName") || "Selecta"),
    maintenanceMode: formData.get("maintenanceMode") === "on",
    maintenanceMessage: String(formData.get("maintenanceMessage") || "") || null,
    allowNewSellers: formData.get("allowNewSellers") === "on",
    allowNewBuyers: formData.get("allowNewBuyers") === "on",
    requireProductApproval: formData.get("requireProductApproval") === "on",
    requireSellerVerification: formData.get("requireSellerVerification") === "on",
    marketplaceStatus: String(formData.get("marketplaceStatus")) as MarketplaceStatus,
  });

  revalidatePath(ROUTES.admin.settings);
}
