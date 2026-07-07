"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { suspendSeller, reinstateSeller, assignAgent } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";

export async function suspendSellerAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const notes = String(formData.get("notes") || "") || undefined;
  await suspendSeller(sellerProfileId, session.userId, notes);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
  revalidatePath(ROUTES.admin.sellers);
}

export async function reinstateSellerAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));
  await reinstateSeller(sellerProfileId, session.userId);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
  revalidatePath(ROUTES.admin.sellers);
}

export async function assignAgentAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const sellerProfileId = String(formData.get("sellerProfileId"));
  const agentUserId = String(formData.get("agentUserId") || "") || null;
  await assignAgent(sellerProfileId, agentUserId, session.userId);
  revalidatePath(ROUTES.admin.seller(sellerProfileId));
}
