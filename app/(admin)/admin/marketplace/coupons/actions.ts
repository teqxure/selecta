"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { createCoupon, setCouponActive } from "@/services/marketing/coupon.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface CreateCouponActionState {
  error?: string;
}

export async function createCouponAction(_prevState: CreateCouponActionState, formData: FormData): Promise<CreateCouponActionState> {
  const session = await requirePermission("CREATE_PROMOTIONS");

  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");
  const minOrderAmount = String(formData.get("minOrderAmount") || "");
  const maxDiscountAmount = String(formData.get("maxDiscountAmount") || "");
  const usageLimit = String(formData.get("usageLimit") || "");
  const usageLimitPerUser = String(formData.get("usageLimitPerUser") || "");
  const applicableCategoryId = String(formData.get("applicableCategoryId") || "") || null;

  try {
    await createCoupon(session.id, {
      code: String(formData.get("code") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      discountType: formData.get("discountType") === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE",
      discountValue: Number(formData.get("discountValue")),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : null,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      applicableCategoryId,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.marketplaceCoupons);
  return {};
}

export async function setCouponActiveAction(formData: FormData) {
  const session = await requirePermission("CREATE_PROMOTIONS");
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  await setCouponActive(session.id, id, isActive);
  revalidatePath(ROUTES.admin.marketplaceCoupons);
}
