"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import {
  upsertIntegrationSetting,
  setIntegrationSecret,
  deleteIntegrationSecret,
} from "@/services/platform/integration-settings.service";
import { findProviderSpec } from "@/lib/constants/integration-providers";
import { ROUTES } from "@/lib/constants/routes";
import type { IntegrationCategory } from "@/generated/prisma/enums";

export async function upsertIntegrationSettingAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  await upsertIntegrationSetting(session.userId, {
    category: String(formData.get("category")) as IntegrationCategory,
    provider: String(formData.get("provider") || "").trim(),
    isEnabled: formData.get("isEnabled") === "on",
    isPrimary: formData.get("isPrimary") === "on",
  });

  revalidatePath(ROUTES.admin.integrations);
}

export async function setIntegrationSecretAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const integrationSettingId = String(formData.get("integrationSettingId"));
  const key = String(formData.get("key") || "").trim();
  const value = String(formData.get("value") || "");
  if (!key || !value) return;

  await setIntegrationSecret(session.userId, integrationSettingId, key, value);
  revalidatePath(ROUTES.admin.integrations);
}

/**
 * Saves every labeled field a known provider defines in one submit —
 * fields left blank are skipped (so re-saving the form without touching
 * an already-configured field doesn't blank it out).
 */
export async function setIntegrationSecretsAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const integrationSettingId = String(formData.get("integrationSettingId"));
  const category = String(formData.get("category")) as IntegrationCategory;
  const provider = String(formData.get("provider") || "");

  const spec = findProviderSpec(category, provider);
  if (!spec) return;

  for (const field of spec.fields) {
    const value = String(formData.get(field.key) || "");
    if (value) {
      await setIntegrationSecret(session.userId, integrationSettingId, field.key, value);
    }
  }

  revalidatePath(ROUTES.admin.integrations);
}

export async function deleteIntegrationSecretAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const id = String(formData.get("id"));

  await deleteIntegrationSecret(session.userId, id);
  revalidatePath(ROUTES.admin.integrations);
}
