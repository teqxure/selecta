import "server-only";
import { db } from "@/lib/db";

interface ProfileNudgePreferences {
  profileNudgeDismissedAt?: string;
}

/**
 * Lightweight, non-blocking "complete your profile" nudge — phone and a
 * default delivery address are genuinely useful before checkout but nothing
 * in the cart/checkout path actually requires them, so this is a dismissible
 * banner, not a gate. Dismissal is permanent (no cooldown/re-show).
 */
export async function shouldShowProfileNudge(userId: string, phone: string | null): Promise<boolean> {
  if (phone) return false;

  const [hasDefaultAddress, user] = await Promise.all([
    db.address.findFirst({ where: { userId, isDefault: true }, select: { id: true } }),
    db.user.findUnique({ where: { id: userId }, select: { preferences: true } }),
  ]);
  if (hasDefaultAddress) return false;

  const prefs = (user?.preferences as { profileNudge?: ProfileNudgePreferences } | null)?.profileNudge;
  return !prefs?.profileNudgeDismissedAt;
}

/** Merges into the existing `User.preferences` JSON — never clobbers the sibling `notifications` namespace already stored there. */
export async function dismissProfileNudge(userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  const existingRaw = (user?.preferences as Record<string, unknown> | null) ?? {};

  await db.user.update({
    where: { id: userId },
    data: { preferences: { ...existingRaw, profileNudge: { profileNudgeDismissedAt: new Date().toISOString() } } },
  });
}
