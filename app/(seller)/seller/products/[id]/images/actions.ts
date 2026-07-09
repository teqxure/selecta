"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { productImagesSchema } from "@/lib/validators/product";
import { updateProductImages, getOwnedProductWithDetails } from "@/services/products/product.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { ProductWizardActionState } from "../../new/actions";

export async function updateProductImagesAction(
  productId: string,
  _prevState: ProductWizardActionState,
  formData: FormData,
): Promise<ProductWizardActionState> {
  const user = await requireActiveRole(Role.SELLER);

  let images: unknown;
  try {
    images = JSON.parse(String(formData.get("images") || "[]"));
  } catch {
    return { error: "Something went wrong reading your photos — please try again" };
  }

  const parsed = productImagesSchema.safeParse({ images });
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  let isDraft = false;
  try {
    const profile = await getSellerProfileByUserId(user.id);
    await updateProductImages(profile.id, productId, parsed.data);
    const product = await getOwnedProductWithDetails(profile.id, productId);
    isDraft = product.status === "DRAFT";
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.productImages(productId));
  if (isDraft) redirect(ROUTES.seller.productDetails(productId));
  return {};
}
