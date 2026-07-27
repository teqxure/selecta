"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { riderVerificationSubmissionSchema } from "@/lib/validators/onboarding";
import { getRiderProfileByUserId, submitRiderVerification } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { RiderOnboardingActionState } from "../personal/actions";

export async function submitRiderVerificationAction(
  _prevState: RiderOnboardingActionState,
  formData: FormData,
): Promise<RiderOnboardingActionState> {
  const user = await requireActiveRole(Role.RIDER);

  const parsed = riderVerificationSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getRiderProfileByUserId(user.id);
    if (profile.onboardingStep < 3) {
      return { error: "Please complete vehicle info first." };
    }
    await submitRiderVerification(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.rider.dashboard);
}
