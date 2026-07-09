import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText, sanitizeText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";
import { assertCanPublishAnotherProduct } from "@/services/monetization/subscription.service";
import { PAGINATION } from "@/lib/constants/app";
import type { ProductDetailsInput, ProductImagesInput, ProductLocationInput, ProductPricingInput } from "@/lib/validators/product";

/** Shared shape for card grids: cover image + enough seller info to render a name. */
const cardInclude = {
  images: { orderBy: { position: "asc" as const }, take: 1 },
  seller: { select: { storeName: true, businessName: true, ratingAverage: true } },
} as const;

const MIN_IMAGES = 2;

/**
 * Every mutation below takes the caller's `sellerProfileId` and re-derives
 * the target row scoped to it (`where: { id, sellerId }`) — the ownership
 * check *is* the query, so a mismatched id is a 0-row NotFoundError rather
 * than a successful cross-seller write.
 */
async function getOwnedProduct(sellerProfileId: string, productId: string) {
  const product = await db.product.findFirst({ where: { id: productId, sellerId: sellerProfileId } });
  if (!product) throw new NotFoundError("Product");
  return product;
}

// ---------------------------------------------------------------------------
// Seller: creation wizard
// ---------------------------------------------------------------------------

export async function createDraftProduct(sellerProfileId: string, input: ProductImagesInput) {
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerProfileId } });
  if (!seller) throw new NotFoundError("Seller profile");

  return db.product.create({
    data: {
      sellerId: sellerProfileId,
      // Placeholder category — replaced in step 2. A product can't exist
      // without one, and we don't want to force category choice before
      // photos on a "extremely simple" upload flow for offline traders.
      categoryId: await getOrCreatePlaceholderCategoryId(),
      title: "Untitled listing",
      price: 0,
      city: seller.city,
      state: seller.state,
      images: {
        create: input.images.map((image, index) => ({ url: image.url, kind: image.kind, position: index })),
      },
    },
    include: { images: true },
  });
}

let placeholderCategoryId: string | null = null;
/** Lazily created so a fresh install doesn't need a manual seed to unblock step 1. */
async function getOrCreatePlaceholderCategoryId() {
  if (placeholderCategoryId) return placeholderCategoryId;
  const category = await db.category.upsert({
    where: { slug: "uncategorized" },
    create: { name: "Uncategorized", slug: "uncategorized", isActive: false },
    update: {},
  });
  placeholderCategoryId = category.id;
  return category.id;
}

export async function updateProductImages(sellerProfileId: string, productId: string, input: ProductImagesInput) {
  await getOwnedProduct(sellerProfileId, productId);

  return db.$transaction(async (tx) => {
    await tx.productImage.deleteMany({ where: { productId } });
    await tx.productImage.createMany({
      data: input.images.map((image, index) => ({ productId, url: image.url, kind: image.kind, position: index })),
    });
    return tx.product.findUniqueOrThrow({ where: { id: productId }, include: { images: true } });
  });
}

export async function updateProductDetails(sellerProfileId: string, productId: string, input: ProductDetailsInput) {
  await getOwnedProduct(sellerProfileId, productId);

  if (input.subcategoryId) {
    const subcategory = await db.category.findUnique({ where: { id: input.subcategoryId } });
    if (!subcategory || subcategory.parentId !== input.categoryId) {
      throw new ValidationError("Selected subcategory doesn't belong to the chosen category");
    }
  }

  return db.product.update({
    where: { id: productId },
    data: {
      title: sanitizeText(input.title),
      description: sanitizeOptionalText(input.description),
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId || null,
      brand: sanitizeOptionalText(input.brand),
      color: sanitizeOptionalText(input.color),
      material: sanitizeOptionalText(input.material),
      gender: input.gender || null,
      size: sanitizeOptionalText(input.size),
      conditionGrade: input.conditionGrade,
    },
  });
}

export async function updateProductPricing(sellerProfileId: string, productId: string, input: ProductPricingInput) {
  await getOwnedProduct(sellerProfileId, productId);

  return db.product.update({
    where: { id: productId },
    data: {
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      estimatedValue: input.estimatedValue ?? null,
    },
  });
}

/** "Similar products sell between ₦X - ₦Y" — a cheap p25/p75-ish range from active listings in the same category. */
export async function getSuggestedPriceRange(categoryId: string) {
  const prices = await db.product.findMany({
    where: { categoryId, status: "ACTIVE" },
    select: { price: true },
    orderBy: { price: "asc" },
  });
  if (prices.length < 3) return null;

  const values = prices.map((p) => Number(p.price));
  const low = values[Math.floor(values.length * 0.25)];
  const high = values[Math.ceil(values.length * 0.75) - 1];
  return { low, high };
}

export async function updateProductLocation(sellerProfileId: string, productId: string, input: ProductLocationInput) {
  await getOwnedProduct(sellerProfileId, productId);

  return db.product.update({
    where: { id: productId },
    data: {
      state: sanitizeText(input.state),
      city: sanitizeText(input.city),
      market: sanitizeOptionalText(input.market),
      pickupLocation: sanitizeOptionalText(input.pickupLocation),
    },
  });
}

export async function publishProduct(sellerProfileId: string, productId: string) {
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerProfileId } });
  if (!seller) throw new NotFoundError("Seller profile");
  if (seller.verificationStatus !== "VERIFIED") {
    throw new ValidationError("Your store must be verified before you can publish listings");
  }

  const product = await getOwnedProduct(sellerProfileId, productId);
  const imageCount = await db.productImage.count({ where: { productId } });

  if (product.title === "Untitled listing") throw new ValidationError("Add a title before publishing");
  if (Number(product.price) <= 0) throw new ValidationError("Set a price before publishing");
  if (imageCount < MIN_IMAGES) throw new ValidationError(`Add at least ${MIN_IMAGES} photos before publishing`);
  await assertCanPublishAnotherProduct(sellerProfileId);

  return db.product.update({ where: { id: productId }, data: { status: "PENDING_REVIEW" } });
}

// ---------------------------------------------------------------------------
// Seller: inventory management
// ---------------------------------------------------------------------------

export interface SellerInventoryFilters {
  q?: string;
  status?: "ACTIVE" | "PENDING_REVIEW" | "SOLD" | "REJECTED" | "PAUSED" | "DRAFT";
}

export function listProductsBySeller(sellerId: string, filters: SellerInventoryFilters = {}) {
  return db.product.findMany({
    where: {
      sellerId,
      status: filters.status ?? { not: "REMOVED" },
      ...(filters.q && { title: { contains: filters.q, mode: "insensitive" } }),
    },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductStatusCounts(sellerId: string) {
  const rows = await db.product.groupBy({
    by: ["status"],
    where: { sellerId },
    _count: true,
  });
  const counts = Object.fromEntries(rows.map((row) => [row.status, row._count]));

  return {
    total: rows.reduce((sum, row) => sum + row._count, 0),
    active: counts.ACTIVE ?? 0,
    pending: counts.PENDING_REVIEW ?? 0,
    sold: counts.SOLD ?? 0,
    rejected: counts.REJECTED ?? 0,
  };
}

export async function getOwnedProductWithDetails(sellerProfileId: string, productId: string) {
  await getOwnedProduct(sellerProfileId, productId);
  return db.product.findUniqueOrThrow({
    where: { id: productId },
    include: { images: { orderBy: { position: "asc" } }, category: true, subcategory: true },
  });
}

export async function pauseProduct(sellerProfileId: string, productId: string) {
  const product = await getOwnedProduct(sellerProfileId, productId);
  if (product.status !== "ACTIVE") throw new ValidationError("Only active listings can be paused");
  return db.product.update({ where: { id: productId }, data: { status: "PAUSED" } });
}

export async function resumeProduct(sellerProfileId: string, productId: string) {
  const product = await getOwnedProduct(sellerProfileId, productId);
  if (product.status !== "PAUSED") throw new ValidationError("Only paused listings can be resumed");
  return db.product.update({ where: { id: productId }, data: { status: "ACTIVE" } });
}

export async function deleteProduct(sellerProfileId: string, productId: string) {
  await getOwnedProduct(sellerProfileId, productId);
  // Soft delete: order history (OrderItem) references products with no
  // cascade, by design — a hard delete would break past receipts.
  return db.product.update({ where: { id: productId }, data: { status: "REMOVED" } });
}

export async function duplicateProduct(sellerProfileId: string, productId: string) {
  const original = await db.product.findFirst({
    where: { id: productId, sellerId: sellerProfileId },
    include: { images: true },
  });
  if (!original) throw new NotFoundError("Product");

  return db.product.create({
    data: {
      sellerId: sellerProfileId,
      categoryId: original.categoryId,
      subcategoryId: original.subcategoryId,
      title: `${original.title} (copy)`,
      description: original.description,
      brand: original.brand,
      color: original.color,
      gender: original.gender,
      size: original.size,
      price: original.price,
      discountPrice: original.discountPrice,
      conditionGrade: original.conditionGrade,
      city: original.city,
      state: original.state,
      status: "DRAFT",
      images: {
        create: original.images.map((image) => ({ url: image.url, kind: image.kind, position: image.position })),
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Admin: moderation
// ---------------------------------------------------------------------------

export function listPendingProducts() {
  return db.product.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { images: { orderBy: { position: "asc" }, take: 1 }, seller: { include: { user: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listProductsForAdmin(status?: string, page = 1, pageSize = PAGINATION.defaultPageSize) {
  const where = status ? { status: status as never } : {};
  const [items, totalCount] = await Promise.all([
    db.product.findMany({
      where,
      include: { images: { orderBy: { position: "asc" }, take: 1 }, seller: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);
  return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}

async function moderateProduct(
  productId: string,
  adminId: string,
  data: { status: "ACTIVE" | "REJECTED" | "REMOVED"; rejectionReason?: string },
  action: string,
) {
  const product = await db.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id: productId },
      data: { status: data.status, rejectionReason: data.rejectionReason ?? null },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action, entityType: "Product", entityId: productId, metadata: data.rejectionReason ? { reason: data.rejectionReason } : undefined },
    });
    return updated;
  });

  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: product.sellerId } });
  const messages: Record<string, [string, string]> = {
    ACTIVE: ["Listing approved", `"${product.title}" is now live on Selecta.`],
    REJECTED: ["Listing needs changes", `"${product.title}" wasn't approved${data.rejectionReason ? `: ${data.rejectionReason}` : "."}`],
    REMOVED: ["Listing removed", `"${product.title}" was removed from Selecta${data.rejectionReason ? `: ${data.rejectionReason}` : "."}`],
  };
  const [title, message] = messages[data.status];
  await createNotification(seller.userId, "SYSTEM", title, message);

  return product;
}

export function approveProduct(productId: string, adminId: string) {
  return moderateProduct(productId, adminId, { status: "ACTIVE" }, "PRODUCT_APPROVED");
}

export function rejectProduct(productId: string, adminId: string, reason: string) {
  return moderateProduct(productId, adminId, { status: "REJECTED", rejectionReason: reason }, "PRODUCT_REJECTED");
}

export function removeProduct(productId: string, adminId: string, reason?: string) {
  return moderateProduct(productId, adminId, { status: "REMOVED", rejectionReason: reason }, "PRODUCT_REMOVED");
}

export async function setProductFeatured(productId: string, adminId: string, featured: boolean) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.update({ where: { id: productId }, data: { isFeatured: featured } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: featured ? "PRODUCT_FEATURED" : "PRODUCT_UNFEATURED",
        entityType: "Product",
        entityId: productId,
      },
    });
    return product;
  });
}

export async function getProductById(id: string) {
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError("Product");
  return product;
}
