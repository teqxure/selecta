"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { productImagesSchema } from "@/lib/validators/product";
import { createDraftProduct } from "@/services/products/product.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface ProductWizardActionState {
  error?: string;
}

export async function createDraftProductAction(
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
  if (!parsed.success) return { error: z.prettifyError(parsed.error) };

  let productId: string;
  try {
    const profile = await getSellerProfileByUserId(user.id);
    const product = await createDraftProduct(profile.id, parsed.data);
    productId = product.id;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.seller.productDetails(productId));
}
