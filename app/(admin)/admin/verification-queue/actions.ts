"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveVerification, rejectVerification } from "@/services/sellers/seller.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";

export async function approveVerificationAction(formData: FormData) {
  const admin = await requirePermission("vendors.verify");
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const { ipAddress } = await getRequestMeta();

  await approveVerification(sellerProfileId, admin.id, undefined, ipAddress);
  revalidatePath(ROUTES.admin.verificationQueue);
}

export async function rejectVerificationAction(formData: FormData) {
  const admin = await requirePermission("vendors.verify");
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const notes = String(formData.get("notes") || "") || undefined;
  const { ipAddress } = await getRequestMeta();

  await rejectVerification(sellerProfileId, admin.id, notes, ipAddress);
  revalidatePath(ROUTES.admin.verificationQueue);
}
