import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import { NotFoundError } from "@/lib/errors";
import type { IntegrationCategory } from "@/generated/prisma/enums";

/** Secrets are never returned in plaintext here — list/detail views only ever see `lastFourDisplay`. */
export function listIntegrationSettings(category?: IntegrationCategory) {
  return db.integrationSetting.findMany({
    where: category ? { category } : undefined,
    include: { secrets: { select: { id: true, key: true, lastFourDisplay: true, rotatedAt: true } } },
    orderBy: [{ category: "asc" }, { provider: "asc" }],
  });
}

/**
 * The row a live payment/notification call should actually use: enabled
 * and marked primary within its category. Returns null rather than
 * guessing — callers (e.g. the payment engine) must treat that as "no
 * provider configured" and fail the request, not silently pick one.
 */
export function getPrimaryIntegration(category: IntegrationCategory) {
  return db.integrationSetting.findFirst({
    where: { category, isEnabled: true, isPrimary: true },
    include: { secrets: true },
  });
}

/** Used by webhook handlers, which are provider-specific and must find their own settings row regardless of which provider is currently primary. */
export function getIntegrationSettingByProvider(category: IntegrationCategory, provider: string) {
  return db.integrationSetting.findUnique({
    where: { category_provider: { category, provider } },
    include: { secrets: true },
  });
}

/** Decrypts one named secret for an integration — used only by server-side provider clients, never by UI code. */
export async function getDecryptedSecret(integrationSettingId: string, key: string): Promise<string> {
  const secret = await db.integrationSecret.findUnique({
    where: { integrationSettingId_key: { integrationSettingId, key } },
  });
  if (!secret) throw new NotFoundError(`Integration secret "${key}"`);
  return decryptSecret(secret.encryptedValue);
}

export interface IntegrationSettingInput {
  category: IntegrationCategory;
  provider: string;
  isEnabled?: boolean;
  isPrimary?: boolean;
  config?: Record<string, unknown>;
}

export async function upsertIntegrationSetting(adminId: string, input: IntegrationSettingInput) {
  return db.$transaction(async (tx) => {
    const setting = await tx.integrationSetting.upsert({
      where: { category_provider: { category: input.category, provider: input.provider } },
      update: {
        isEnabled: input.isEnabled,
        isPrimary: input.isPrimary,
        config: input.config as object | undefined,
        updatedById: adminId,
      },
      create: {
        category: input.category,
        provider: input.provider,
        isEnabled: input.isEnabled ?? false,
        isPrimary: input.isPrimary ?? false,
        config: input.config as object | undefined,
        updatedById: adminId,
      },
    });

    // Only one primary provider per category — demote any other rows so
    // the payment engine never faces an ambiguous "primary" choice.
    if (input.isPrimary) {
      await tx.integrationSetting.updateMany({
        where: { category: input.category, id: { not: setting.id } },
        data: { isPrimary: false },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "INTEGRATION_SETTING_UPDATED",
        entityType: "IntegrationSetting",
        entityId: setting.id,
        metadata: { category: input.category, provider: input.provider, isEnabled: input.isEnabled, isPrimary: input.isPrimary },
      },
    });

    return setting;
  });
}

/** Stores a provider credential encrypted at rest; only the last 4 characters are ever kept in the clear (for display). */
export async function setIntegrationSecret(adminId: string, integrationSettingId: string, key: string, plainValue: string) {
  return db.$transaction(async (tx) => {
    const secret = await tx.integrationSecret.upsert({
      where: { integrationSettingId_key: { integrationSettingId, key } },
      update: { encryptedValue: encryptSecret(plainValue), lastFourDisplay: plainValue.slice(-4), rotatedAt: new Date() },
      create: {
        integrationSettingId,
        key,
        encryptedValue: encryptSecret(plainValue),
        lastFourDisplay: plainValue.slice(-4),
      },
    });

    // Never log the value itself — only that a rotation happened.
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "INTEGRATION_SECRET_ROTATED",
        entityType: "IntegrationSetting",
        entityId: integrationSettingId,
        metadata: { key },
      },
    });

    return { id: secret.id, key: secret.key, lastFourDisplay: secret.lastFourDisplay, rotatedAt: secret.rotatedAt };
  });
}

export async function deleteIntegrationSecret(adminId: string, id: string) {
  const secret = await db.integrationSecret.findUnique({ where: { id } });
  if (!secret) throw new NotFoundError("Integration secret");

  await db.$transaction(async (tx) => {
    await tx.integrationSecret.delete({ where: { id } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "INTEGRATION_SECRET_DELETED",
        entityType: "IntegrationSetting",
        entityId: secret.integrationSettingId,
        metadata: { key: secret.key },
      },
    });
  });
}
