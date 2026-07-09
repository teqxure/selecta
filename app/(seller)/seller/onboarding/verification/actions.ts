"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { verificationSubmissionSchema } from "@/lib/validators/onboarding";
import { getSellerProfileByUserId, submitVerification, skipVerificationStep } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { OnboardingActionState } from "../personal/actions";

export async function submitVerificationAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = verificationSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    if (profile.onboardingStep < 3) {
      return { error: "Please complete store setup first." };
    }
    await submitVerification(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.seller.dashboard);
}

/** "Skip for now" — reaches the dashboard without submitting docs; the dashboard's verification reminder is how they come back to finish this later. */
export async function skipVerificationAction() {
  const user = await requireActiveRole(Role.SELLER);

  const profile = await getSellerProfileByUserId(user.id);
  if (profile.onboardingStep < 3) redirect(ROUTES.seller.onboarding.store);

  await skipVerificationStep(user.id, profile.id);
  redirect(ROUTES.seller.dashboard);
}
