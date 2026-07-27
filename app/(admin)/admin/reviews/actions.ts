"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { setReviewHidden } from "@/services/products/review.service";
import { ROUTES } from "@/lib/constants/routes";

export async function setReviewHiddenAction(formData: FormData) {
  const session = await requirePermission("content.manage");
  const reviewId = String(formData.get("reviewId"));
  const isHidden = formData.get("isHidden") === "true";

  await setReviewHidden(session.id, reviewId, isHidden);
  revalidatePath(ROUTES.admin.reviews);
}
