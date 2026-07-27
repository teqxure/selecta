import "server-only";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeOptionalText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";

export function listActiveDocumentTypes() {
  return db.complianceDocumentType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export function listAllDocumentTypes() {
  return db.complianceDocumentType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export interface DocumentTypeInput {
  name: string;
  description?: string | null;
  category?: string | null;
  requirement: "REQUIRED" | "OPTIONAL" | "CONDITIONAL";
  conditionNote?: string | null;
  sortOrder?: number;
}

export async function createDocumentType(adminId: string, input: DocumentTypeInput) {
  const slug = input.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const existing = await db.complianceDocumentType.findUnique({ where: { slug } });
  if (existing) throw new ValidationError(`A document type named "${input.name}" already exists`);

  return db.$transaction(async (tx) => {
    const type = await tx.complianceDocumentType.create({ data: { ...input, slug, createdById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DOCUMENT_TYPE_CREATED", entityType: "ComplianceDocumentType", entityId: type.id, metadata: input as object },
    });
    return type;
  });
}

export async function setDocumentTypeActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const type = await tx.complianceDocumentType.update({ where: { id }, data: { isActive } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isActive ? "DOCUMENT_TYPE_ACTIVATED" : "DOCUMENT_TYPE_DEACTIVATED",
        entityType: "ComplianceDocumentType",
        entityId: id,
      },
    });
    return type;
  });
}

/** A seller's vault: every active document type paired with their latest submission for it, if any. */
export async function getSellerDocumentVault(sellerProfileId: string) {
  const [types, documents] = await Promise.all([
    listActiveDocumentTypes(),
    db.sellerDocument.findMany({ where: { sellerProfileId }, orderBy: { submittedAt: "desc" } }),
  ]);

  const latestByType = new Map<string, (typeof documents)[number]>();
  for (const doc of documents) {
    if (!latestByType.has(doc.documentTypeId)) latestByType.set(doc.documentTypeId, doc);
  }

  return types.map((type) => ({ type, document: latestByType.get(type.id) ?? null }));
}

/** Re-upload is just a new row for the same (seller, type) pair — history is read back from AuditLog, not overwritten here. */
export async function submitSellerDocument(sellerProfileId: string, documentTypeId: string, fileUrl: string) {
  const type = await db.complianceDocumentType.findUnique({ where: { id: documentTypeId } });
  if (!type || !type.isActive) throw new NotFoundError("Document type");

  const document = await db.sellerDocument.create({
    data: { sellerProfileId, documentTypeId, fileUrl, status: "PENDING" },
  });

  await db.auditLog.create({
    data: { action: "SELLER_DOCUMENT_SUBMITTED", entityType: "SellerDocument", entityId: document.id, metadata: { documentTypeId } },
  });

  return document;
}

export function listDocumentReviewQueue(status?: "PENDING" | "APPROVED" | "REJECTED") {
  return db.sellerDocument.findMany({
    where: status ? { status } : {},
    include: { sellerProfile: { include: { user: true } }, documentType: true },
    orderBy: { submittedAt: "asc" },
  });
}

async function reviewSellerDocument(
  documentId: string,
  reviewerId: string,
  status: "APPROVED" | "REJECTED",
  notes: string | undefined,
  rejectionReason: string | undefined,
  ipAddress?: string,
) {
  return db.$transaction(async (tx) => {
    const document = await tx.sellerDocument.findUnique({ where: { id: documentId }, include: { sellerProfile: true, documentType: true } });
    if (!document) throw new NotFoundError("Document");
    if (document.status !== "PENDING") throw new ValidationError("This document has already been reviewed");

    const updated = await tx.sellerDocument.update({
      where: { id: documentId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: sanitizeOptionalText(notes),
        rejectionReason: status === "REJECTED" ? sanitizeOptionalText(rejectionReason) : null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: reviewerId,
        action: status === "APPROVED" ? "SELLER_DOCUMENT_APPROVED" : "SELLER_DOCUMENT_REJECTED",
        entityType: "SellerDocument",
        entityId: documentId,
        metadata: { documentTypeId: document.documentTypeId, notes, rejectionReason },
        ipAddress,
      },
    });

    await createNotification(
      document.sellerProfile.userId,
      "SYSTEM",
      status === "APPROVED" ? "Document approved" : "Document needs changes",
      status === "APPROVED"
        ? `Your "${document.documentType.name}" document was approved.`
        : `Your "${document.documentType.name}" document wasn't approved${rejectionReason ? `: ${rejectionReason}` : "."}`,
    );

    return updated;
  });
}

export function approveSellerDocument(documentId: string, reviewerId: string, notes?: string, ipAddress?: string) {
  return reviewSellerDocument(documentId, reviewerId, "APPROVED", notes, undefined, ipAddress);
}

export function rejectSellerDocument(documentId: string, reviewerId: string, reason: string, ipAddress?: string) {
  return reviewSellerDocument(documentId, reviewerId, "REJECTED", undefined, reason, ipAddress);
}
