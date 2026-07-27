"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { approveSellerDocument, rejectSellerDocument } from "@/services/compliance/document.service";
import { getRequestMeta } from "@/lib/security/request-meta";
import { ROUTES } from "@/lib/constants/routes";

export async function approveSellerDocumentAction(formData: FormData) {
  const session = await requirePermission("VERIFY_DOCUMENTS");
  const documentId = String(formData.get("documentId"));
  const notes = String(formData.get("notes") || "").trim() || undefined;

  const { ipAddress } = await getRequestMeta();
  await approveSellerDocument(documentId, session.id, notes, ipAddress);
  revalidatePath(ROUTES.admin.complianceDocuments);
}

export async function rejectSellerDocumentAction(formData: FormData) {
  const session = await requirePermission("VERIFY_DOCUMENTS");
  const documentId = String(formData.get("documentId"));
  const reason = String(formData.get("reason") || "").trim();

  const { ipAddress } = await getRequestMeta();
  await rejectSellerDocument(documentId, session.id, reason, ipAddress);
  revalidatePath(ROUTES.admin.complianceDocuments);
}
