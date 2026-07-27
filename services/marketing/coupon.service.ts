import "server-only";
import { db } from "@/lib/db";
import { ValidationError, ConflictError } from "@/lib/errors";
import type { DiscountType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

export function listCoupons() {
  return db.coupon.findMany({
    include: { applicableCategory: true, _count: { select: { redemptions: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getCouponByCode(code: string) {
  return db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
}

export interface CouponInput {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  applicableCategoryId?: string | null;
}

export async function createCoupon(adminId: string, input: CouponInput) {
  if (input.discountType === "PERCENTAGE" && (input.discountValue <= 0 || input.discountValue > 100)) {
    throw new ValidationError("Percentage discounts must be between 0 and 100");
  }
  if (input.discountValue <= 0) throw new ValidationError("Discount value must be positive");

  const code = input.code.trim().toUpperCase();
  const existing = await db.coupon.findUnique({ where: { code } });
  if (existing) throw new ConflictError(`A coupon with code "${code}" already exists`);

  return db.$transaction(async (tx) => {
    const coupon = await tx.coupon.create({
      data: { ...input, code, applicableCategoryId: input.applicableCategoryId ?? null, createdById: adminId },
    });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "COUPON_CREATED", entityType: "Coupon", entityId: coupon.id, metadata: { ...input, code } as object },
    });

    return coupon;
  });
}

export async function setCouponActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const coupon = await tx.coupon.update({ where: { id }, data: { isActive } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "COUPON_ACTIVATED" : "COUPON_DEACTIVATED", entityType: "Coupon", entityId: id },
    });
    return coupon;
  });
}

/**
 * Server-side coupon validation + pricing — never trust a client-supplied
 * discount amount. Mirrors the same principle already used for delivery
 * pricing: the client sends a code, the server derives the price.
 */
export async function validateAndPriceCoupon(code: string, userId: string, itemsSubtotal: number, categoryIds: string[]) {
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw new ValidationError("Invalid coupon code");
  if (!coupon.isActive) throw new ValidationError("This coupon is no longer active");

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new ValidationError("This coupon isn't active yet");
  if (coupon.endsAt && coupon.endsAt < now) throw new ValidationError("This coupon has expired");
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new ValidationError("This coupon has reached its usage limit");
  if (coupon.minOrderAmount && itemsSubtotal < Number(coupon.minOrderAmount)) {
    throw new ValidationError(`This coupon requires a minimum order of ${Number(coupon.minOrderAmount)}`);
  }
  if (coupon.applicableCategoryId && !categoryIds.includes(coupon.applicableCategoryId)) {
    throw new ValidationError("This coupon doesn't apply to the items in your cart");
  }

  if (coupon.usageLimitPerUser !== null) {
    const userRedemptions = await db.couponRedemption.count({ where: { couponId: coupon.id, userId } });
    if (userRedemptions >= coupon.usageLimitPerUser) throw new ValidationError("You've already used this coupon the maximum number of times");
  }

  let discountAmount =
    coupon.discountType === "PERCENTAGE" ? (itemsSubtotal * Number(coupon.discountValue)) / 100 : Number(coupon.discountValue);

  if (coupon.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscountAmount));
  discountAmount = Math.min(discountAmount, itemsSubtotal);

  return { couponId: coupon.id, discountAmount: Math.round(discountAmount * 100) / 100 };
}

/** Called inside the same order-creation transaction as the order itself — records the redemption and increments usedCount atomically. */
export async function recordCouponRedemption(
  tx: Prisma.TransactionClient,
  couponId: string,
  userId: string,
  orderId: string,
  discountAmount: number,
) {
  await tx.couponRedemption.create({ data: { couponId, userId, orderId, discountAmount } });
  await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
}
