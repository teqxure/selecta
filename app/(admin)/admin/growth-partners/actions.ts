"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateGrowthPartnerApplication } from "@/services/monetization/growth-partner.service";
import { ROUTES } from "@/lib/constants/routes";
import type { GrowthApplicationStatus } from "@/generated/prisma/enums";

export async function updateGrowthPartnerApplicationAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const applicationId = String(formData.get("applicationId"));
  const status = String(formData.get("status") || "") as GrowthApplicationStatus;
  const notes = String(formData.get("notes") || "");

  await updateGrowthPartnerApplication(session.userId, applicationId, { status, notes });
  revalidatePath(ROUTES.admin.growthPartners);
}
