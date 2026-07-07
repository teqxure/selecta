"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveProduct, rejectProduct, removeProduct, setProductFeatured } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";

export async function approveProductAction(formData: FormData) {
  const admin = await requirePermission("products.moderate");
  await approveProduct(String(formData.get("productId")), admin.id);
  revalidatePath(ROUTES.admin.products);
}

export async function rejectProductAction(formData: FormData) {
  const admin = await requirePermission("products.moderate");
  const reason = String(formData.get("reason") || "") || "Doesn't meet our listing guidelines";
  await rejectProduct(String(formData.get("productId")), admin.id, reason);
  revalidatePath(ROUTES.admin.products);
}

export async function removeProductAction(formData: FormData) {
  const admin = await requirePermission("products.moderate");
  const reason = String(formData.get("reason") || "") || undefined;
  await removeProduct(String(formData.get("productId")), admin.id, reason);
  revalidatePath(ROUTES.admin.products);
}

export async function toggleFeaturedAction(formData: FormData) {
  const admin = await requirePermission("products.moderate");
  const featured = formData.get("featured") === "true";
  await setProductFeatured(String(formData.get("productId")), admin.id, !featured);
  revalidatePath(ROUTES.admin.products);
}
