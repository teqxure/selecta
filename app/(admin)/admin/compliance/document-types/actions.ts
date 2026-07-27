"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { createDocumentType, setDocumentTypeActive } from "@/services/compliance/document.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError } from "@/lib/errors";

export interface CreateDocumentTypeActionState {
  error?: string;
}

export async function createDocumentTypeAction(
  _prevState: CreateDocumentTypeActionState,
  formData: FormData,
): Promise<CreateDocumentTypeActionState> {
  const session = await requireRole(Role.SUPER_ADMIN);

  const requirement = String(formData.get("requirement") || "REQUIRED");

  try {
    await createDocumentType(session.userId, {
      name: String(formData.get("name") || "").trim(),
      description: String(formData.get("description") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || null,
      requirement: requirement === "OPTIONAL" || requirement === "CONDITIONAL" ? requirement : "REQUIRED",
      conditionNote: String(formData.get("conditionNote") || "").trim() || null,
    });
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.admin.complianceDocumentTypes);
  return {};
}

export async function setDocumentTypeActiveAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));
  const isActive = formData.get("isActive") === "true";

  await setDocumentTypeActive(session.userId, id, isActive);
  revalidatePath(ROUTES.admin.complianceDocumentTypes);
}
