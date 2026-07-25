"use server";

import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { publishProduct, SELLER_NOT_VERIFIED_MESSAGE } from "@/services/products/product.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface ReviewActionState {
  error?: string;
  needsVerification?: boolean;
}

export async function publishProductAction(
  productId: string,
  _prevState: ReviewActionState,
): Promise<ReviewActionState> {
  const user = await requireActiveRole(Role.SELLER);

  try {
    const profile = await getSellerProfileByUserId(user.id);
    await publishProduct(profile.id, productId);
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message, needsVerification: error.message === SELLER_NOT_VERIFIED_MESSAGE };
    }
    throw error;
  }

  redirect(ROUTES.seller.products);
}
