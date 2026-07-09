"use server";

import { revalidatePath } from "next/cache";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { verificationSubmissionSchema } from "@/lib/validators/onboarding";
import { getSellerProfileByUserId, submitVerification } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";

export interface VerificationActionState {
  error?: string;
  success?: boolean;
}

export async function submitVerificationStandaloneAction(
  _prevState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = verificationSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    await submitVerification(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.verification);
  return { success: true };
}
