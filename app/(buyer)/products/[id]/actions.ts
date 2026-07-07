"use server";

import { requireAuth } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { recordContactSeller } from "@/services/products/product.service";

export async function revealSellerContactAction(productId: string) {
  const session = await requireAuth();

  const product = await db.product.findUnique({
    where: { id: productId },
    include: { seller: { include: { user: true } } },
  });
  if (!product) throw new NotFoundError("Product");

  await recordContactSeller(productId, session.userId);

  return { phone: product.seller.user.phone, storeName: product.seller.storeName ?? product.seller.businessName };
}
