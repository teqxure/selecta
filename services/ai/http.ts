import "server-only";

/**
 * Shared request plumbing for every AI adapter — timeout and retry are
 * provider-agnostic concerns, so they live here once rather than being
 * copy-pasted into each adapter file. An adapter only supplies the URL,
 * method, headers, and body; this handles the abort/backoff behavior
 * identically no matter which provider is on the other end.
 */

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function isRetryableStatus(status: number): boolean {
  return status >= 500;
}

/**
 * Retries only on network failure (fetch throwing, e.g. DNS/connection
 * reset) or an HTTP 5xx response — never on a 4xx, since that's a real
 * error (bad key, bad request body, rate limited) that retrying can't fix
 * and would just repeat. Exponential backoff: 300ms, 600ms, ... capped at
 * `attempts` extra tries beyond the first.
 */
export async function fetchWithTimeoutAndRetry(
  url: string,
  init: RequestInit,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? MAX_RETRIES;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (response.ok || !isRetryableStatus(response.status) || attempt === retries) {
        return response;
      }
      // 5xx with attempts remaining — fall through to backoff and retry.
    } catch (error) {
      if (attempt === retries) throw error;
      // Network-level failure (abort/timeout, DNS, connection reset) with attempts remaining — fall through to backoff and retry.
    } finally {
      clearTimeout(timeout);
    }

    await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
  }
}
