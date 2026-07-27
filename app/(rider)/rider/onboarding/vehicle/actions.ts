"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { riderVehicleSchema } from "@/lib/validators/onboarding";
import { completeRiderVehicleStep, getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { RiderOnboardingActionState } from "../personal/actions";

export async function submitRiderVehicleAction(
  _prevState: RiderOnboardingActionState,
  formData: FormData,
): Promise<RiderOnboardingActionState> {
  const user = await requireActiveRole(Role.RIDER);

  const parsed = riderVehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getRiderProfileByUserId(user.id);
    if (profile.onboardingStep < 2) return { error: "Please complete the previous step first." };
    await completeRiderVehicleStep(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.rider.onboarding.verification);
}
