"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { categorySchema } from "@/lib/validators/category";
import { createCategory, deleteCategory, setCategoryActive, updateCategory } from "@/services/categories/category.service";
import { formatZodError, isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

export interface CategoryActionState {
  error?: string;
}

export async function createCategoryAction(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requirePermission("content.manage");

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    await createCategory(parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.categories);
  return {};
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await requirePermission("content.manage");

  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: formatZodError(parsed.error) };

  try {
    await updateCategory(categoryId, parsed.data);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.categories);
  return {};
}

export async function toggleCategoryActiveAction(formData: FormData) {
  await requirePermission("content.manage");
  const id = String(formData.get("categoryId"));
  const isActive = formData.get("isActive") === "true";
  await setCategoryActive(id, !isActive);
  revalidatePath(ROUTES.admin.categories);
}

export async function deleteCategoryAction(formData: FormData) {
  await requirePermission("content.manage");
  const id = String(formData.get("categoryId"));
  await deleteCategory(id);
  revalidatePath(ROUTES.admin.categories);
}
