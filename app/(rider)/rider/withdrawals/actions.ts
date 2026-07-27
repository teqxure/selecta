"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { requestRiderWithdrawal } from "@/services/logistics/rider-withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface RequestRiderWithdrawalState {
  error?: string;
}

export async function requestRiderWithdrawalAction(
  _prevState: RequestRiderWithdrawalState,
  formData: FormData,
): Promise<RequestRiderWithdrawalState> {
  const session = await requireRole(Role.RIDER);
  const profile = await getRiderProfileByUserId(session.userId);

  try {
    await requestRiderWithdrawal(session.userId, profile.id, {
      amount: Number(formData.get("amount")),
      bankName: String(formData.get("bankName") || "").trim(),
      accountNumber: String(formData.get("accountNumber") || "").trim(),
      accountName: String(formData.get("accountName") || "").trim(),
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.rider.withdrawals);
  revalidatePath(ROUTES.rider.wallet);
  return {};
}
