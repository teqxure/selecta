"use server";

import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateSellerSettingsSchema } from "@/lib/validators/profile";
import { getSellerProfileByUserId, updateStoreSettings } from "@/services/sellers/seller.service";
import { isAppError } from "@/lib/errors";

export interface SettingsActionState {
  error?: string;
  success?: boolean;
}

export async function updateSellerSettingsAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = updateSellerSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    await updateStoreSettings(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  return { success: true };
}
