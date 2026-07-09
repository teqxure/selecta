import "server-only";
import { db } from "@/lib/db";
import type { MarketplaceStatus } from "@/generated/prisma/enums";

const SINGLETON_ID = "singleton";

/** Creates the row with defaults on first read — nothing to configure before launch. */
export async function getSystemSettings() {
  return db.systemSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export interface SystemSettingsInput {
  platformName?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  allowNewSellers?: boolean;
  allowNewBuyers?: boolean;
  requireProductApproval?: boolean;
  requireSellerVerification?: boolean;
  marketplaceStatus?: MarketplaceStatus;
  notificationSenderName?: string;
  notificationSenderEmail?: string | null;
}

export async function updateSystemSettings(adminId: string, data: SystemSettingsInput) {
  return db.$transaction(async (tx) => {
    const settings = await tx.systemSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { ...data, updatedById: adminId },
      create: { id: SINGLETON_ID, ...data, updatedById: adminId },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "SYSTEM_SETTINGS_UPDATED",
        entityType: "SystemSettings",
        entityId: SINGLETON_ID,
        metadata: data as object,
      },
    });

    return settings;
  });
}
