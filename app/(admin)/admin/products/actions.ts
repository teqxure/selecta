"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { approveProduct, rejectProduct, removeProduct, setProductFeatured } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";

export async function approveProductAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  await approveProduct(String(formData.get("productId")), session.userId);
  revalidatePath(ROUTES.admin.products);
}

export async function rejectProductAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const reason = String(formData.get("reason") || "") || "Doesn't meet our listing guidelines";
  await rejectProduct(String(formData.get("productId")), session.userId, reason);
  revalidatePath(ROUTES.admin.products);
}

export async function removeProductAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const reason = String(formData.get("reason") || "") || undefined;
  await removeProduct(String(formData.get("productId")), session.userId, reason);
  revalidatePath(ROUTES.admin.products);
}

export async function toggleFeaturedAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const featured = formData.get("featured") === "true";
  await setProductFeatured(String(formData.get("productId")), session.userId, !featured);
  revalidatePath(ROUTES.admin.products);
}
