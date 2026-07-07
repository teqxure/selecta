"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { suspendSeller, reinstateSeller, assignAgent } from "@/services/sellers/seller.service";
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
