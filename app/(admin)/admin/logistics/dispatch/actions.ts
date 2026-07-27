"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { assignRiderToDeliveryAndNotify, unassignRider } from "@/services/logistics/dispatch.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface DispatchActionState {
  error?: string;
}

export async function assignRiderAction(_prevState: DispatchActionState, formData: FormData): Promise<DispatchActionState> {
  const session = await requirePermission("ASSIGN_RIDERS");
  const deliveryId = String(formData.get("deliveryId"));
  const riderUserId = String(formData.get("riderUserId"));

  try {
    await assignRiderToDeliveryAndNotify(session.id, deliveryId, riderUserId);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.logisticsDispatch);
  return {};
}

export async function unassignRiderAction(formData: FormData) {
  const session = await requirePermission("ASSIGN_RIDERS");
  const deliveryId = String(formData.get("deliveryId"));

  await unassignRider(session.id, deliveryId);
  revalidatePath(ROUTES.admin.logisticsDispatch);
}
