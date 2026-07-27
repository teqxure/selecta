"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { createRiderAccount, setRiderActive } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface CreateRiderActionState {
  error?: string;
}

export async function createRiderAction(_prevState: CreateRiderActionState, formData: FormData): Promise<CreateRiderActionState> {
  const session = await requirePermission("MANAGE_LOGISTICS");

  try {
    await createRiderAccount(session.id, {
      firstName: String(formData.get("firstName") || "").trim(),
      lastName: String(formData.get("lastName") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      vehicleType: String(formData.get("vehicleType") || "").trim() || null,
      vehiclePlateNumber: String(formData.get("vehiclePlateNumber") || "").trim() || null,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.logisticsRiders);
  return {};
}

export async function setRiderActiveAction(formData: FormData) {
  const session = await requirePermission("MANAGE_LOGISTICS");
  const riderProfileId = String(formData.get("riderProfileId"));
  const isActive = formData.get("isActive") === "true";

  await setRiderActive(session.id, riderProfileId, isActive);
  revalidatePath(ROUTES.admin.logisticsRiders);
}
