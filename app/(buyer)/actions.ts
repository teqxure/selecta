"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { saveProduct, unsaveProduct } from "@/services/products/saved-product.service";
import { addToCart, removeFromCart } from "@/services/products/cart.service";
import { recordShare, recordContactSeller } from "@/services/products/product.service";
import { followStore, unfollowStore } from "@/services/sellers/store-follow.service";
import { ROUTES } from "@/lib/constants/routes";

export async function toggleSaveProductAction(productId: string, currentlySaved: boolean) {
  const session = await requireAuth();

  if (currentlySaved) {
    await unsaveProduct(session.userId, productId);
  } else {
    await saveProduct(session.userId, productId);
  }

  revalidatePath(ROUTES.saved);
  return { saved: !currentlySaved };
}

export async function addToCartAction(productId: string) {
  const session = await requireAuth();
  await addToCart(session.userId, productId);
  revalidatePath("/cart");
}

export async function removeFromCartAction(productId: string) {
  const session = await requireAuth();
  await removeFromCart(session.userId, productId);
  revalidatePath("/cart");
}

export async function recordProductShareAction(productId: string) {
  const session = await requireAuth().catch(() => null);
  await recordShare(productId, session?.userId);
}

export async function recordContactSellerAction(productId: string) {
  const session = await requireAuth();
  await recordContactSeller(productId, session.userId);
}

export async function toggleFollowStoreAction(sellerProfileId: string, currentlyFollowing: boolean) {
  const session = await requireAuth();

  if (currentlyFollowing) {
    await unfollowStore(session.userId, sellerProfileId);
  } else {
    await followStore(session.userId, sellerProfileId);
  }

  return { following: !currentlyFollowing };
}
