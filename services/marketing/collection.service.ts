import "server-only";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

export function listCollections() {
  return db.collection.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export function getCollection(id: string) {
  return db.collection.findUnique({
    where: { id },
    include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export interface CollectionInput {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
}

export async function createCollection(adminId: string, input: CollectionInput) {
  const existing = await db.collection.findUnique({ where: { slug: input.slug } });
  if (existing) throw new ValidationError(`A collection with slug "${input.slug}" already exists`);

  return db.$transaction(async (tx) => {
    const collection = await tx.collection.create({ data: { ...input, createdById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "COLLECTION_CREATED", entityType: "Collection", entityId: collection.id, metadata: input as object },
    });
    return collection;
  });
}

export async function setCollectionActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const collection = await tx.collection.update({ where: { id }, data: { isActive } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "COLLECTION_ACTIVATED" : "COLLECTION_DEACTIVATED", entityType: "Collection", entityId: id },
    });
    return collection;
  });
}

export async function addProductToCollection(adminId: string, collectionId: string, productId: string) {
  const existing = await db.collectionProduct.findUnique({ where: { collectionId_productId: { collectionId, productId } } });
  if (existing) throw new ValidationError("This product is already in the collection");

  const maxSort = await db.collectionProduct.aggregate({ where: { collectionId }, _max: { sortOrder: true } });

  return db.$transaction(async (tx) => {
    const row = await tx.collectionProduct.create({
      data: { collectionId, productId, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "COLLECTION_PRODUCT_ADDED", entityType: "Collection", entityId: collectionId, metadata: { productId } },
    });
    return row;
  });
}

export async function removeProductFromCollection(adminId: string, collectionId: string, productId: string) {
  return db.$transaction(async (tx) => {
    await tx.collectionProduct.delete({ where: { collectionId_productId: { collectionId, productId } } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "COLLECTION_PRODUCT_REMOVED", entityType: "Collection", entityId: collectionId, metadata: { productId } },
    });
  });
}

/** Buyer-facing: active collections with their products, for storefront display. */
export function listActiveCollectionsWithProducts() {
  return db.collection.findMany({
    where: { isActive: true },
    include: { products: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
}
