"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { createCollection, setCollectionActive, addProductToCollection, removeProductFromCollection } from "@/services/marketing/collection.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface CreateCollectionActionState {
  error?: string;
}

export async function createCollectionAction(
  _prevState: CreateCollectionActionState,
  formData: FormData,
): Promise<CreateCollectionActionState> {
  const session = await requirePermission("CREATE_PROMOTIONS");

  try {
    await createCollection(session.id, {
      name: String(formData.get("name") || "").trim(),
      slug: String(formData.get("slug") || "").trim().toLowerCase(),
      description: String(formData.get("description") || "").trim() || null,
      imageUrl: String(formData.get("imageUrl") || "").trim() || null,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.marketplaceCollections);
  return {};
}

export async function setCollectionActiveAction(formData: FormData) {
  const session = await requirePermission("CREATE_PROMOTIONS");
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  await setCollectionActive(session.id, id, isActive);
  revalidatePath(ROUTES.admin.marketplaceCollections);
}

export async function addProductToCollectionAction(formData: FormData) {
  const session = await requirePermission("CREATE_PROMOTIONS");
  const collectionId = String(formData.get("collectionId"));
  const productId = String(formData.get("productId"));

  await addProductToCollection(session.id, collectionId, productId);
  revalidatePath(ROUTES.admin.collection(collectionId));
}

export async function removeProductFromCollectionAction(formData: FormData) {
  const session = await requirePermission("CREATE_PROMOTIONS");
  const collectionId = String(formData.get("collectionId"));
  const productId = String(formData.get("productId"));

  await removeProductFromCollection(session.id, collectionId, productId);
  revalidatePath(ROUTES.admin.collection(collectionId));
}
