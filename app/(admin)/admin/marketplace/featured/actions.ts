"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { setProductFeatured } from "@/services/products/product.service";
import { ROUTES } from "@/lib/constants/routes";

export async function setFeaturedAction(formData: FormData) {
  const session = await requirePermission("MANAGE_PRODUCTS");
  const productId = String(formData.get("productId"));
  const featured = formData.get("featured") === "true";

  await setProductFeatured(productId, session.id, featured);
  revalidatePath(ROUTES.admin.marketplaceFeatured);
}
