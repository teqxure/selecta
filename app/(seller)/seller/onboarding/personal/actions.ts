"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { personalInfoSchema } from "@/lib/validators/onboarding";
import { completePersonalInfoStep, getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";

export interface OnboardingActionState {
  error?: string;
}

export async function submitPersonalInfoAction(
  _prevState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = personalInfoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    await completePersonalInfoStep(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.seller.onboarding.store);
}
