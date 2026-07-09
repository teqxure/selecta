import "server-only";
import { db } from "@/lib/db";
import { notifyMany } from "@/services/notifications/notify.service";

/** A round, easy-to-explain threshold — not a finance policy, just the line above which Super Admins get paged about a payout. Adjust freely; it's not read from anywhere else. */
export const LARGE_WITHDRAWAL_THRESHOLD_NGN = 500_000;

/**
 * Fans an admin-alert out to every currently active Super Admin — new
 * seller applications, large withdrawals, new disputes, failed payments,
 * security events. Never targets ADMIN accounts (only Super Admin sees
 * platform-wide alerts), mirroring the same "Super Admin only" boundary
 * already used for role-change visibility.
 */
export async function alertAdmins(title: string, message: string, options: { actionUrl?: string; metadata?: Record<string, unknown> } = {}) {
  const superAdmins = await db.user.findMany({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  if (superAdmins.length === 0) return;

  await notifyMany(
    superAdmins.map((admin) => admin.id),
    {
      event: "ADMIN_ALERT",
      title,
      message,
      actionUrl: options.actionUrl,
      metadata: options.metadata,
      emailVariables: { alertTitle: title, message },
    },
  );
}
