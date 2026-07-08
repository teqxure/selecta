import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateReviewInput {
  orderItemId: string;
  rating: number;
  comment?: string;
}

/**
 * Every rule here is enforced against the actual purchase record, not
 * trusted from the caller:
 *  - "only verified buyers" -> the order item must belong to THIS buyer
 *  - "only completed orders" -> the parent order must be COMPLETED
 *  - "one review per purchased item" -> orderItemId is @unique on Review;
 *    a second attempt hits the DB constraint, not just an app-level check
 *  - "vendor cannot review own product" -> falls out naturally, since a
 *    seller reviewing their own sale would require the order item to
 *    belong to their own purchase, which a seller can't be the buyer of
 *    their own product's sale in the first place — but checked explicitly
 *    below anyway, in case an account is ever both buyer and seller.
 */
export async function createReview(buyerId: string, input: CreateReviewInput) {
  if (input.rating < 1 || input.rating > 5) {
    throw new ValidationError("Rating must be between 1 and 5");
  }

  const orderItem = await db.orderItem.findUnique({
    where: { id: input.orderItemId },
    include: { order: true, product: { include: { seller: true } }, review: true },
  });
  if (!orderItem) throw new NotFoundError("Order item");

  if (orderItem.order.buyerId !== buyerId) throw new ForbiddenError("You can only review items you purchased");
  if (orderItem.order.status !== "COMPLETED") {
    throw new ValidationError("You can only review items from a completed order");
  }
  if (orderItem.product.seller.userId === buyerId) {
    throw new ForbiddenError("You cannot review your own product");
  }
  if (orderItem.review) throw new ConflictError("You've already reviewed this item");

  let created;
  try {
    created = await db.review.create({
      data: {
        productId: orderItem.productId,
        authorId: buyerId,
        orderItemId: orderItem.id,
        rating: input.rating,
        comment: input.comment,
      },
    });
  } catch (error) {
    // Two concurrent submissions for the same item both pass the check
    // above; the `orderItemId` unique constraint is what actually
    // guarantees only one review ever lands, and this is the friendly
    // message for whichever request loses that race.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new ConflictError("You've already reviewed this item");
    }
    throw error;
  }

  const ratingAverage = await recomputeSellerRating(orderItem.product.sellerId);

  await createNotification(
    orderItem.product.seller.userId,
    "SYSTEM",
    "New review",
    `Your product "${orderItem.product.title}" received a ${input.rating}-star review.`,
  );

  return { ...created, sellerRatingAverage: ratingAverage };
}

/** Recomputes a seller's aggregate rating from every review across all their products. */
async function recomputeSellerRating(sellerId: string) {
  const aggregate = await db.review.aggregate({
    where: { product: { sellerId } },
    _avg: { rating: true },
    _count: true,
  });

  const ratingAverage = aggregate._avg.rating ?? 0;
  await db.sellerProfile.update({
    where: { id: sellerId },
    data: { ratingAverage, ratingCount: aggregate._count },
  });

  return ratingAverage;
}

export function listReviewsForProduct(productId: string) {
  return db.review.findMany({
    where: { productId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Order items from a completed order the buyer hasn't reviewed yet — what drives the "leave a review" prompts. */
export async function listReviewableItemsForOrder(orderId: string, buyerId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true, review: true } } },
  });
  if (!order) throw new NotFoundError("Order");
  if (order.buyerId !== buyerId) throw new ForbiddenError();
  if (order.status !== "COMPLETED") return [];

  return order.items.filter((item) => !item.review);
}
