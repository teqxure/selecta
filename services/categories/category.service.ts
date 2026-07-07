import "server-only";
import { db } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { CategoryInput } from "@/lib/validators/category";

export function listCategoryTree() {
  return db.category.findMany({
    where: { parentId: null },
    include: { children: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export function listActiveCategoryTree() {
  return db.category.findMany({
    where: { parentId: null, isActive: true },
    include: { children: { where: { isActive: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

export function listAllCategoriesFlat() {
  return db.category.findMany({ orderBy: [{ parentId: "asc" }, { name: "asc" }] });
}

export async function getCategoryById(id: string) {
  const category = await db.category.findUnique({ where: { id } });
  if (!category) throw new NotFoundError("Category");
  return category;
}

export async function createCategory(input: CategoryInput) {
  const existing = await db.category.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ConflictError("A category with this slug already exists");

  if (input.parentId) {
    const parent = await db.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new ValidationError("Parent category not found");
    if (parent.parentId) throw new ValidationError("Categories can only be nested one level deep");
  }

  return db.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId || null,
      imageUrl: input.imageUrl || null,
    },
  });
}

export async function updateCategory(id: string, input: CategoryInput) {
  const category = await getCategoryById(id);

  const slugOwner = await db.category.findUnique({ where: { slug: input.slug } });
  if (slugOwner && slugOwner.id !== id) throw new ConflictError("A category with this slug already exists");

  if (input.parentId === id) throw new ValidationError("A category cannot be its own parent");

  return db.category.update({
    where: { id: category.id },
    data: {
      name: input.name,
      slug: input.slug,
      parentId: input.parentId || null,
      imageUrl: input.imageUrl || null,
    },
  });
}

export async function setCategoryActive(id: string, isActive: boolean) {
  await getCategoryById(id);
  return db.category.update({ where: { id }, data: { isActive } });
}

export async function deleteCategory(id: string) {
  const [childCount, productCount] = await Promise.all([
    db.category.count({ where: { parentId: id } }),
    db.product.count({ where: { OR: [{ categoryId: id }, { subcategoryId: id }] } }),
  ]);

  if (childCount > 0) throw new ValidationError("Remove or reassign subcategories first");
  if (productCount > 0) throw new ValidationError("Deactivate instead — products still reference this category");

  await db.category.delete({ where: { id } });
}
