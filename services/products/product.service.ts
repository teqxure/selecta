import "server-only";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { PAGINATION } from "@/lib/constants/app";
import type { CreateProductInput } from "@/lib/validators/product";
import type { PaginatedResult } from "@/types";

export async function createProduct(sellerId: string, input: CreateProductInput) {
  return db.product.create({
    data: {
      sellerId,
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      price: input.price,
      quantity: input.quantity,
      images: input.images,
    },
  });
}

export function listProductsBySeller(sellerId: string) {
  return db.product.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" } });
}

export async function getProductById(id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("Product");
  return product;
}

type ProductRecord = Awaited<ReturnType<typeof db.product.findMany>>[number];

export async function listActiveProducts(
  page = 1,
  pageSize = PAGINATION.defaultPageSize,
): Promise<PaginatedResult<ProductRecord>> {
  const [items, totalCount] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}
