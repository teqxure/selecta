import { env } from "@/lib/env";

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/**
 * No nonce here on purpose: Next's nonce-based strict CSP requires every
 * page to opt into dynamic rendering (see
 * node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
 * which would disable static optimization/ISR app-wide. `'unsafe-inline'`
 * on script/style keeps that intact while still blocking the main threats
 * a CSP guards against here — injected `<script src>`/`<img>`/`fetch`
 * pointed at an attacker-controlled origin, clickjacking, and form
 * hijacking. `img-src`/`connect-src` allow the R2 buckets images actually
 * load from/upload to, plus Google's avatar host for Sign in with Google.
 */
const r2PublicHost = hostOf(env.R2_PUBLIC_URL);
const r2ApiHost = hostOf(env.R2_ENDPOINT) ?? (env.R2_ACCOUNT_ID ? `${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : null);

const imgSrc = ["'self'", "data:", "https://lh3.googleusercontent.com", r2PublicHost ? `https://${r2PublicHost}` : "https://*.r2.dev"];
const connectSrc = ["'self'", ...(r2ApiHost ? [`https://${r2ApiHost}`] : [])];

const CONTENT_SECURITY_POLICY = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src ${imgSrc.join(" ")}`,
  `font-src 'self' data:`,
  `connect-src ${connectSrc.join(" ")}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
].join("; ");

/**
 * Security headers applied to every response in `proxy.ts`. Centralized so
 * a CSP change doesn't require hunting through route handlers.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
};

export function applySecurityHeaders(headers: Headers) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  return headers;
}
