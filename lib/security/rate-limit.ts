/**
 * In-memory fixed-window rate limiter — preparation only. This works for a
 * single long-lived process (e.g. local dev, a single container) but each
 * Vercel serverless invocation can land on a different instance, so it does
 * NOT provide real protection in that deployment target. Swap `attempts`
 * for an Upstash Redis-backed counter (same function signature) before
 * relying on this in production.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, retryAfterSeconds: 0 };
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
