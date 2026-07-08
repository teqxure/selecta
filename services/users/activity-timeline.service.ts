import "server-only";
import { db } from "@/lib/db";

export interface TimelineEntry {
  id: string;
  createdAt: Date;
  /** Human-readable description, e.g. "Admin John suspended this account" or "Logged in". */
  description: string;
  /** "auth" (login/logout attempts), "activity" (self-driven account/marketplace events), or "admin" (an admin acted on this account). */
  source: "auth" | "activity" | "admin";
  actorName?: string;
  metadata?: unknown;
}

const AUDIT_ACTION_DESCRIPTIONS: Record<string, (metadata: Record<string, unknown> | null) => string> = {
  USER_ROLE_CHANGED: (m) => `Role changed: ${m?.fromRole ?? "?"} → ${m?.toRole ?? "?"}`,
  USER_STATUS_CHANGED: (m) => `Status changed: ${m?.fromStatus ?? "?"} → ${m?.toStatus ?? "?"}`,
  SESSION_REVOKED: () => "A session was terminated",
  ALL_SESSIONS_REVOKED: (m) => `All sessions terminated (${m?.revokedCount ?? "?"} session${m?.revokedCount === 1 ? "" : "s"})`,
  PASSWORD_FORCE_RESET: () => "Password was force-reset by an admin",
};

/**
 * Unifies the three separate tables this codebase already tracks per-user
 * activity across — `UserActivity` (self-driven marketplace/account
 * events), `LoginHistory` (auth attempts), and `AuditLog` (admin actions
 * taken on this account) — into one chronological feed for the Super Admin
 * User Detail Center. Deliberately doesn't introduce a new table; this is
 * a read-side composition of what already exists (Phase 1 audit finding).
 */
export async function getUserTimeline(userId: string, take = 40): Promise<TimelineEntry[]> {
  const [activities, logins, auditEntries] = await Promise.all([
    db.userActivity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take }),
    db.loginHistory.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take }),
    db.auditLog.findMany({
      where: { entityType: "User", entityId: userId },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const actorIds = [...new Set(auditEntries.map((entry) => entry.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const actorNameById = new Map(actors.map((actor) => [actor.id, `${actor.firstName} ${actor.lastName}`]));

  const entries: TimelineEntry[] = [
    ...activities.map((activity) => ({
      id: `activity_${activity.id}`,
      createdAt: activity.createdAt,
      description: describeActivity(activity.action),
      source: "activity" as const,
      metadata: activity.metadata,
    })),
    ...logins.map((login) => ({
      id: `login_${login.id}`,
      createdAt: login.createdAt,
      description: login.success ? "Logged in" : `Failed login attempt${login.reason ? ` (${login.reason})` : ""}`,
      source: "auth" as const,
    })),
    ...auditEntries.map((entry) => ({
      id: `audit_${entry.id}`,
      createdAt: entry.createdAt,
      description:
        AUDIT_ACTION_DESCRIPTIONS[entry.action]?.(entry.metadata as Record<string, unknown> | null) ?? entry.action,
      source: "admin" as const,
      actorName: entry.actorId ? (actorNameById.get(entry.actorId) ?? "Unknown admin") : "System",
      metadata: entry.metadata,
    })),
  ];

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, take);
}

function describeActivity(action: string): string {
  switch (action) {
    case "ACCOUNT_CREATED":
      return "Account created";
    default:
      return action.replaceAll("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }
}
