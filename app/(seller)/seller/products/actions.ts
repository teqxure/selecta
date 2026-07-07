"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { pauseProduct, resumeProduct, deleteProduct, duplicateProduct } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";

async function ownSellerProfileId() {
  const user = await requireActiveRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(user.id);
  return profile.id;
}

export async function pauseProductAction(formData: FormData) {
  const sellerId = await ownSellerProfileId();
  await pauseProduct(sellerId, String(formData.get("productId")));
  revalidatePath(ROUTES.seller.products);
}

export async function resumeProductAction(formData: FormData) {
  const sellerId = await ownSellerProfileId();
  await resumeProduct(sellerId, String(formData.get("productId")));
  revalidatePath(ROUTES.seller.products);
}

export async function deleteProductAction(formData: FormData) {
  const sellerId = await ownSellerProfileId();
  await deleteProduct(sellerId, String(formData.get("productId")));
  revalidatePath(ROUTES.seller.products);
}

export async function duplicateProductAction(formData: FormData) {
  const sellerId = await ownSellerProfileId();
  const duplicate = await duplicateProduct(sellerId, String(formData.get("productId")));
  redirect(ROUTES.seller.productDetails(duplicate.id));
}
