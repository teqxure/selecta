"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { submitSellerDocument } from "@/services/compliance/document.service";
import { ROUTES } from "@/lib/constants/routes";
import { ValidationError } from "@/lib/errors";

export async function submitSellerDocumentAction(formData: FormData) {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const documentTypeId = String(formData.get("documentTypeId") || "");
  const fileUrl = String(formData.get("fileUrl") || "");
  if (!fileUrl) throw new ValidationError("Upload a file before submitting");

  await submitSellerDocument(profile.id, documentTypeId, fileUrl);
  revalidatePath(ROUTES.seller.compliance);
}
