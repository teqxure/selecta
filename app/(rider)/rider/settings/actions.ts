"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { personalInfoSchema, riderVehicleSchema } from "@/lib/validators/onboarding";
import { getRiderProfileByUserId, updateRiderSettings } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";

export interface RiderSettingsActionState {
  error?: string;
  success?: boolean;
}

export async function updateRiderSettingsAction(
  _prevState: RiderSettingsActionState,
  formData: FormData,
): Promise<RiderSettingsActionState> {
  const session = await requireRole(Role.RIDER);

  const personalParsed = personalInfoSchema.safeParse(Object.fromEntries(formData));
  if (!personalParsed.success) return { error: formatZodError(personalParsed.error) };

  const vehicleParsed = riderVehicleSchema.safeParse(Object.fromEntries(formData));
  if (!vehicleParsed.success) return { error: formatZodError(vehicleParsed.error) };

  try {
    const profile = await getRiderProfileByUserId(session.userId);
    await updateRiderSettings(session.userId, profile.id, { ...personalParsed.data, ...vehicleParsed.data });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.rider.settings);
  return { success: true };
}
