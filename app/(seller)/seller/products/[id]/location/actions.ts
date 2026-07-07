"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { productLocationSchema } from "@/lib/validators/product";
import { updateProductLocation, getOwnedProductWithDetails } from "@/services/products/product.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";
import type { ProductWizardActionState } from "../../new/actions";

export async function updateProductLocationAction(
  productId: string,
  _prevState: ProductWizardActionState,
  formData: FormData,
): Promise<ProductWizardActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = productLocationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  let isDraft = false;
  try {
    const profile = await getSellerProfileByUserId(user.id);
    await updateProductLocation(profile.id, productId, parsed.data);
    const product = await getOwnedProductWithDetails(profile.id, productId);
    isDraft = product.status === "DRAFT";
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.productLocation(productId));
  if (isDraft) redirect(ROUTES.seller.productReview(productId));
  return {};
}
