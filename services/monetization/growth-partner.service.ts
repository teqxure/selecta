import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText } from "@/lib/security/sanitize";

/**
 * Phase-10 placeholder for the future "Selecta Growth Partner" managed
 * service — intake only. No delivery workflow (assigned-manager dashboard,
 * campaign notes UI) exists yet; Super Admin can record `assignedManagerId`/
 * `notes` directly against a row for now, ahead of that surface being built.
 */
export function getGrowthPartnerApplication(sellerId: string) {
  return db.growthPartnerApplication.findFirst({ where: { sellerId }, orderBy: { createdAt: "desc" } });
}

export async function applyForGrowthPartner(sellerId: string, message: string) {
  const existing = await getGrowthPartnerApplication(sellerId);
  if (existing && (existing.status === "PENDING" || existing.status === "REVIEWING")) {
    throw new ValidationError("You already have an application in progress");
  }

  const cleaned = sanitizeOptionalText(message);
  if (cleaned && cleaned.length > 2000) throw new ValidationError("Message is too long (2000 characters max)");

  return db.growthPartnerApplication.create({
    data: { sellerId, message: cleaned, status: "PENDING" },
  });
}

export function listGrowthPartnerApplications() {
  return db.growthPartnerApplication.findMany({
    include: { seller: { include: { user: true } }, assignedManager: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateGrowthPartnerApplication(
  adminId: string,
  applicationId: string,
  input: { status?: "PENDING" | "REVIEWING" | "ACCEPTED" | "REJECTED"; assignedManagerId?: string | null; notes?: string },
) {
  const existing = await db.growthPartnerApplication.findUnique({ where: { id: applicationId } });
  if (!existing) throw new NotFoundError("Growth partner application");

  return db.$transaction(async (tx) => {
    const updated = await tx.growthPartnerApplication.update({
      where: { id: applicationId },
      data: {
        status: input.status,
        assignedManagerId: input.assignedManagerId,
        notes: input.notes !== undefined ? sanitizeOptionalText(input.notes) : undefined,
      },
    });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "GROWTH_PARTNER_APPLICATION_UPDATED", entityType: "GrowthPartnerApplication", entityId: applicationId, metadata: input as object },
    });

    return updated;
  });
}
