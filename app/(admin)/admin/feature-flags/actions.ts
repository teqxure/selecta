"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { setFeatureFlag } from "@/services/platform/feature-flags.service";
import { ROUTES } from "@/lib/constants/routes";

export async function setFeatureFlagAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const key = String(formData.get("key") || "").trim();
  if (!key) return;

  await setFeatureFlag(session.userId, key, formData.get("isEnabled") === "on", {
    label: String(formData.get("label") || "") || undefined,
    description: String(formData.get("description") || "") || null,
  });

  revalidatePath(ROUTES.admin.featureFlags);
}
