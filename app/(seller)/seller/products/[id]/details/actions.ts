"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { productDetailsSchema, CONDITION_GRADE_LABELS } from "@/lib/validators/product";
import { updateProductDetails, getOwnedProductWithDetails } from "@/services/products/product.service";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { generateProductDescription } from "@/services/ai/product-writer.service";
import { db } from "@/lib/db";
import { ROUTES } from "@/lib/constants/routes";
import { formatZodError, isAppError } from "@/lib/errors";
import type { ProductWizardActionState } from "../../new/actions";

export async function updateProductDetailsAction(
  productId: string,
  _prevState: ProductWizardActionState,
  formData: FormData,
): Promise<ProductWizardActionState> {
  const user = await requireActiveRole(Role.SELLER);

  const parsed = productDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  let isDraft = false;
  try {
    const profile = await getSellerProfileByUserId(user.id);
    await updateProductDetails(profile.id, productId, parsed.data);
    const product = await getOwnedProductWithDetails(profile.id, productId);
    isDraft = product.status === "DRAFT";
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.seller.productDetails(productId));
  if (isDraft) redirect(ROUTES.seller.productPricing(productId));
  return {};
}

export interface GenerateDescriptionState {
  description?: string;
  error?: string;
}

/**
 * Called directly (not via <form action>) from a "Generate with AI" button
 * — category/subcategory names are resolved server-side from their ids
 * rather than trusted from the client, everything else (plan/usage gate,
 * the actual OpenAI call) lives in generateProductDescription.
 */
export async function generateProductDescriptionAction(productId: string, formData: FormData): Promise<GenerateDescriptionState> {
  const user = await requireActiveRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(user.id);

  // Ownership check — throws if this product isn't this seller's.
  await getOwnedProductWithDetails(profile.id, productId);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Add a title first so the AI has something to describe." };

  const categoryId = String(formData.get("categoryId") ?? "");
  const subcategoryId = String(formData.get("subcategoryId") ?? "");
  const [category, subcategory] = await Promise.all([
    categoryId ? db.category.findUnique({ where: { id: categoryId }, select: { name: true } }) : null,
    subcategoryId ? db.category.findUnique({ where: { id: subcategoryId }, select: { name: true } }) : null,
  ]);

  const conditionGrade = String(formData.get("conditionGrade") ?? "");

  try {
    const description = await generateProductDescription(profile.id, {
      title,
      categoryName: category?.name ?? "Fashion item",
      subcategoryName: subcategory?.name ?? undefined,
      brand: String(formData.get("brand") ?? "") || undefined,
      color: String(formData.get("color") ?? "") || undefined,
      material: String(formData.get("material") ?? "") || undefined,
      gender: String(formData.get("gender") ?? "") || undefined,
      conditionLabel: CONDITION_GRADE_LABELS[conditionGrade as keyof typeof CONDITION_GRADE_LABELS] ?? undefined,
    });
    return { description };
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }
}
