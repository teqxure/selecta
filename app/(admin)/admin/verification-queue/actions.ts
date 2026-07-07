"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { approveVerification, rejectVerification } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";

export async function approveVerificationAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));

  await approveVerification(sellerProfileId, session.userId);
  revalidatePath(ROUTES.admin.verificationQueue);
}

export async function rejectVerificationAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const notes = String(formData.get("notes") || "") || undefined;

  await rejectVerification(sellerProfileId, session.userId, notes);
  revalidatePath(ROUTES.admin.verificationQueue);
}
