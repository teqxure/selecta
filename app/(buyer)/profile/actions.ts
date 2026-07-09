"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveUser, requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateBuyerProfileSchema, addressSchema } from "@/lib/validators/profile";
import { updateBuyerProfile } from "@/services/users/user.service";
import { createAddress, deleteAddress, setDefaultAddress } from "@/services/users/address.service";
import { updateNotificationPreferences } from "@/services/notifications/preferences.service";
import { switchToSellerMode } from "@/services/users/role-switch.service";
import { dismissProfileNudge } from "@/services/users/profile-nudge.service";
import { reissueSessionCookieWithRole } from "@/lib/auth/session";
import { formatZodError, isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

export interface ProfileActionState {
  error?: string;
  success?: boolean;
}

export async function updateProfileAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireActiveUser();

  const parsed = updateBuyerProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await updateBuyerProfile(user.id, parsed.data);
  revalidatePath(ROUTES.profile);
  return { success: true };
}

export async function addAddressAction(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireActiveUser();

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  await createAddress(user.id, parsed.data);
  revalidatePath(ROUTES.profile);
  return { success: true };
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireActiveUser();
  const addressId = String(formData.get("addressId"));

  try {
    await deleteAddress(user.id, addressId);
  } catch (error) {
    if (!isAppError(error)) throw error;
  }
  revalidatePath(ROUTES.profile);
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await requireActiveUser();
  const addressId = String(formData.get("addressId"));

  try {
    await setDefaultAddress(user.id, addressId);
  } catch (error) {
    if (!isAppError(error)) throw error;
  }
  revalidatePath(ROUTES.profile);
}

export async function updateNotificationPreferencesAction(formData: FormData) {
  const user = await requireActiveUser();

  await updateNotificationPreferences(user.id, {
    orderUpdates: formData.get("orderUpdates") === "on",
    sellerUpdates: formData.get("sellerUpdates") === "on",
    marketing: formData.get("marketing") === "on",
  });

  revalidatePath(ROUTES.profile);
}

export async function startSellingAction() {
  const user = await requireActiveRole(Role.BUYER);

  const { destination } = await switchToSellerMode(user.id);
  await reissueSessionCookieWithRole(Role.SELLER);

  redirect(destination);
}

export async function dismissProfileNudgeAction() {
  const user = await requireActiveUser();
  await dismissProfileNudge(user.id);
  revalidatePath(ROUTES.orders);
}
