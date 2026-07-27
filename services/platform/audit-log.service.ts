import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { PaginatedResult } from "@/types";

export interface ListAuditLogFilters {
  entityType?: string;
  actorId?: string;
  search?: string;
}

/**
 * The Security Center's first human-readable view over `AuditLog` — the
 * model has been write-only until this phase. Every entry already carries
 * who (`actorId`)/when (`createdAt`)/what (`action`, `entityType`,
 * `entityId`)/where-from (`ipAddress`) plus an old/new-value + reason
 * payload in `metadata` wherever the writer supplied one.
 */
export async function listAuditLogs(
  page = 1,
  pageSize = 50,
  filters: ListAuditLogFilters = {},
): Promise<PaginatedResult<Prisma.AuditLogGetPayload<{ include: { actor: true } }>>> {
  const where: Prisma.AuditLogWhereInput = {
    ...(filters.entityType && { entityType: filters.entityType }),
    ...(filters.actorId && { actorId: filters.actorId }),
    ...(filters.search && {
      OR: [
        { action: { contains: filters.search, mode: "insensitive" } },
        { entityId: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, totalCount] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count({ where }),
  ]);

  return { items, page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) };
}

/** Distinct entity types seen in the log, for the filter dropdown — computed, not hardcoded, so it never drifts from what's actually being logged. */
export async function listAuditLogEntityTypes(): Promise<string[]> {
  const rows = await db.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true }, orderBy: { entityType: "asc" } });
  return rows.map((r) => r.entityType);
}
