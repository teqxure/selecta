"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { suspendSeller, reinstateSeller, assignAgent } from "@/services/sellers/seller.service";
import { createManualAdjustment } from "@/services/finance/adjustment.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";

export async function suspendSellerAction(formData: FormData) {
  const admin = await requirePermission("vendors.manage");
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const notes = String(formData.get("notes") || "") || undefined;
  const { ipAddress } = await getRequestMeta();
  await suspendSeller(sellerProfileId, admin.id, notes, ipAddress);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
  revalidatePath(ROUTES.admin.sellers);
}

export async function reinstateSellerAction(formData: FormData) {
  const admin = await requirePermission("vendors.manage");
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const { ipAddress } = await getRequestMeta();
  await reinstateSeller(sellerProfileId, admin.id, ipAddress);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
  revalidatePath(ROUTES.admin.sellers);
}

export async function assignAgentAction(formData: FormData) {
  const admin = await requirePermission("vendors.manage");
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const agentUserId = String(formData.get("agentUserId") || "") || null;
  await assignAgent(sellerProfileId, agentUserId, admin.id);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
}

/** Manual wallet correction — Super Admin exclusive, never delegable via the ADMIN permission system. */
export async function manualAdjustmentAction(formData: FormData) {
  const superAdmin = await requireRole(Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const amount = Number(formData.get("amount"));
  const reason = String(formData.get("reason") || "");

  await createManualAdjustment(superAdmin.userId, sellerProfileId, amount, reason);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
}
