"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateSellerSettingsSchema } from "@/lib/validators/profile";
import { getSellerProfileByUserId, updateStoreSettings } from "@/services/sellers/seller.service";
import { switchToBuyerMode } from "@/services/users/role-switch.service";
import { reissueSessionCookieWithRole } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";

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
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    const profile = await getSellerProfileByUserId(user.id);
    await updateStoreSettings(user.id, profile.id, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  return { success: true };
}

export async function switchToShoppingAction() {
  const user = await requireActiveRole(Role.SELLER);

  await switchToBuyerMode(user.id);
  await reissueSessionCookieWithRole(Role.BUYER);

  redirect(ROUTES.home);
}
