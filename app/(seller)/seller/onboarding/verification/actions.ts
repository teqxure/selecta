"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { verificationSubmissionSchema } from "@/lib/validators/onboarding";
import { getSellerProfileByUserId, submitVerification } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";
import type { OnboardingActionState } from "../personal/actions";

export async function submitVerificationAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = verificationSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

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
