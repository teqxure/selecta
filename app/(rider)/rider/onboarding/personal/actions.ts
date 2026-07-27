"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { personalInfoSchema } from "@/lib/validators/onboarding";
import { completeRiderPersonalStep, getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";

export interface RiderOnboardingActionState {
  error?: string;
}

export async function submitRiderPersonalInfoAction(
  _prevState: RiderOnboardingActionState,
  formData: FormData,
): Promise<RiderOnboardingActionState> {
  const user = await requireActiveRole(Role.RIDER);

  const parsed = personalInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getRiderProfileByUserId(user.id);
    await completeRiderPersonalStep(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.rider.onboarding.vehicle);
}
