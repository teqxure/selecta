"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { requestWithdrawal } from "@/services/payments/withdrawal.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface RequestWithdrawalState {
  error?: string;
}

export async function requestWithdrawalAction(
  _prevState: RequestWithdrawalState,
  formData: FormData,
): Promise<RequestWithdrawalState> {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  try {
    await requestWithdrawal(session.userId, profile.id, {
      amount: Number(formData.get("amount")),
      bankName: String(formData.get("bankName") || "").trim(),
      accountNumber: String(formData.get("accountNumber") || "").trim(),
      accountName: String(formData.get("accountName") || "").trim(),
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.withdrawals);
  revalidatePath(ROUTES.seller.wallet);
  return {};
}
