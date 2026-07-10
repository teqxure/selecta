import "server-only";
import { db } from "@/lib/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Persisted fixed-window rate limiter (see `RateLimitEntry` in
 * schema.prisma). Deliberately NOT a single atomic SQL statement — under a
 * genuine simultaneous burst, two requests can both read the same
 * pre-increment count and both get admitted, overshooting the limit by a
 * request or two. That's an acceptable trade for a rate limiter (the goal
 * is "roughly N per window," not a hard financial invariant); the
 * meaningful fix this replaces is that the old in-memory version gave
 * *zero* protection in a multi-instance serverless deployment, since every
 * invocation could land on a fresh, empty counter.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const now = new Date();

  const existing = await db.rateLimitEntry.findUnique({ where: { key } });

  if (!existing || existing.resetAt <= now) {
    const resetAt = new Date(now.getTime() + windowSeconds * 1000);
    await db.rateLimitEntry.upsert({
      where: { key },
      create: { key, count: 1, resetAt },
      update: { count: 1, resetAt },
    });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000) };
  }

  await db.rateLimitEntry.update({ where: { key }, data: { count: { increment: 1 } } });
  return { allowed: true, remaining: limit - existing.count - 1, retryAfterSeconds: 0 };
}

/** Login attempts: 10 per 15 minutes per (email or IP). */
export function checkLoginRateLimit(identifier: string) {
  return checkRateLimit(`login:${identifier}`, 10, 15 * 60);
}

/** Messages sent: 20 per 5 minutes per user — real conversation pace, not spam-bot pace. */
export function checkMessageRateLimit(userId: string) {
  return checkRateLimit(`message:${userId}`, 20, 5 * 60);
}

/** New conversations started ("contact seller"): 10 per hour per user. */
export function checkConversationRateLimit(userId: string) {
  return checkRateLimit(`conversation:${userId}`, 10, 60 * 60);
}

/** Checkout attempts: 8 per 5 minutes per user — throttles repeated hits to the payment provider. */
export function checkCheckoutRateLimit(userId: string) {
  return checkRateLimit(`checkout:${userId}`, 8, 5 * 60);
}

/**
 * AI generations: 10 per 5 minutes per seller — a real per-plan monthly cap
 * is enforced separately by the entitlement engine, but that alone doesn't
 * stop a burst of rapid-fire calls (each one a real, billed third-party API
 * call) from running up cost within a single minute; this bounds request
 * pace regardless of what the monthly limit is set to.
 */
export function checkAiGenerateRateLimit(sellerId: string) {
  return checkRateLimit(`ai-generate:${sellerId}`, 10, 5 * 60);
}

/** Deletes expired counters — call periodically (see the monetization cron sweep) so this table doesn't grow forever. */
export async function pruneExpiredRateLimitEntries() {
  const result = await db.rateLimitEntry.deleteMany({ where: { resetAt: { lt: new Date() } } });
  return result.count;
}
