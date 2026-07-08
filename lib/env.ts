import { z } from "zod";

/**
 * Single source of truth for environment variables. Import `env` instead of
 * reading `process.env` directly anywhere else in the codebase — this fails
 * fast at startup instead of surfacing as an obscure runtime error deep in a
 * request path.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  DATABASE_URL: z.url(),
  DIRECT_URL: z.url(),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  /**
   * 32-byte key (base64) for AES-256-GCM encryption of integration secrets
   * at rest (Paystack/Flutterwave keys etc.) — those provider credentials
   * themselves live in the database (IntegrationSecret), configured by
   * Super Admin without a redeploy, not in env vars. This key is the one
   * exception: it has to be an env var, since it's what unlocks everything
   * stored under it.
   */
  SETTINGS_ENCRYPTION_KEY: z.string().min(32, "SETTINGS_ENCRYPTION_KEY must be at least 32 characters"),

  /**
   * Cloudflare R2 (S3-compatible object storage). `R2_ENDPOINT` is optional
   * because it's derivable from `R2_ACCOUNT_ID` (the standard
   * `https://<account_id>.r2.cloudflarestorage.com` form) — see
   * services/storage/storage.service.ts. `R2_PUBLIC_URL` is the separate
   * public-read base (a custom domain or the bucket's r2.dev URL) used to
   * build URLs stored in the database; the S3 API endpoint itself is not
   * publicly readable.
   */
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET_NAME: z.string().min(1).optional(),
  R2_ENDPOINT: z.url().optional(),
  R2_PUBLIC_URL: z.url().optional(),

  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  /**
   * Google OAuth 2.0 (Sign in with Google) — from a Google Cloud Console
   * project's OAuth client (APIs & Services -> Credentials). Optional
   * because the app must run before these are configured; the "Continue
   * with Google" buttons are hidden when unset (see lib/auth/google.ts).
   */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
});

function loadEnv() {
  // Treat blank strings (common in .env files for "not yet configured")
  // the same as unset, so `.optional()` fields behave as expected.
  const normalized = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]),
  );

  const parsed = envSchema.safeParse(normalized);

  if (!parsed.success) {
    console.error("Invalid environment variables:", z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables — check .env against .env.example");
  }

  return parsed.data;
}

export const env = loadEnv();
