import "server-only";
import { db } from "@/lib/db";

export function listFeatureFlags() {
  return db.featureFlag.findMany({ orderBy: { key: "asc" } });
}

/** Missing flag = disabled. Callers gate optional/rollout code paths with this, never a hardcoded boolean. */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({ where: { key } });
  return flag?.isEnabled ?? false;
}

export async function setFeatureFlag(
  adminId: string,
  key: string,
  isEnabled: boolean,
  meta?: { label?: string; description?: string | null },
) {
  return db.$transaction(async (tx) => {
    const flag = await tx.featureFlag.upsert({
      where: { key },
      update: { isEnabled, updatedById: adminId, ...meta },
      create: {
        key,
        isEnabled,
        updatedById: adminId,
        label: meta?.label ?? key,
        description: meta?.description ?? null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isEnabled ? "FEATURE_FLAG_ENABLED" : "FEATURE_FLAG_DISABLED",
        entityType: "FeatureFlag",
        entityId: key,
      },
    });

    return flag;
  });
}
