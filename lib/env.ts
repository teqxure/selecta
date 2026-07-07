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

  SCALEWAY_ACCESS_KEY_ID: z.string().min(1).optional(),
  SCALEWAY_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  SCALEWAY_BUCKET_NAME: z.string().min(1).optional(),
  SCALEWAY_REGION: z.string().default("fr-par"),
  SCALEWAY_ENDPOINT: z.url().optional(),

  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
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
