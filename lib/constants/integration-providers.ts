import type { IntegrationCategory } from "@/generated/prisma/enums";

export interface ProviderSecretField {
  /** The exact key stored in IntegrationSecret.key — must match what the corresponding service reads via getDecryptedSecret(). */
  key: string;
  label: string;
  placeholder?: string;
  helperText?: string;
}

export interface ProviderSpec {
  /** Matches IntegrationSetting.provider exactly. */
  value: string;
  label: string;
  fields: ProviderSecretField[];
  /** Set when nothing in the codebase reads this provider's secrets yet — stored securely, but not live. */
  notYetWired?: boolean;
}

/**
 * What each provider actually needs, labeled — the alternative to asking
 * Super Admin to freehand a raw key name like "SECRET_KEY" and guess at
 * it. Every `key` here must match what the corresponding integration
 * point actually calls `getDecryptedSecret(settingId, key)` with (see
 * app/api/webhooks/{paystack,flutterwave}/route.ts and
 * services/payments/checkout.service.ts) — if you add a field here, wire
 * the read site too, or mark `notYetWired`.
 */
export const PROVIDER_CATALOG: Record<IntegrationCategory, ProviderSpec[]> = {
  PAYMENT: [
    {
      value: "paystack",
      label: "Paystack",
      fields: [{ key: "SECRET_KEY", label: "Secret Key", placeholder: "sk_live_...", helperText: "Paystack dashboard → Settings → API Keys & Webhooks" }],
    },
    {
      value: "flutterwave",
      label: "Flutterwave",
      fields: [
        { key: "SECRET_KEY", label: "Secret Key", placeholder: "FLWSECK-...", helperText: "Used to initialize and verify transactions" },
        { key: "SECRET_HASH", label: "Webhook Secret Hash", placeholder: "Set this same value in your Flutterwave webhook settings" },
      ],
    },
  ],
  STORAGE: [
    {
      value: "cloudflare-r2",
      label: "Cloudflare R2",
      notYetWired: true,
      fields: [
        { key: "ACCOUNT_ID", label: "Account ID" },
        { key: "ACCESS_KEY_ID", label: "Access Key ID" },
        { key: "SECRET_ACCESS_KEY", label: "Secret Access Key" },
        { key: "BUCKET_NAME", label: "Bucket Name" },
      ],
      // Note: R2 currently reads its credentials from environment
      // variables (R2_ACCOUNT_ID etc. in lib/env.ts), not from here —
      // this entry exists so the value can be reviewed/rotated in one
      // place later without a code change once that's migrated over.
    },
  ],
  EMAIL: [
    {
      value: "resend",
      label: "Resend",
      notYetWired: true,
      fields: [{ key: "API_KEY", label: "API Key", placeholder: "re_..." }],
    },
    {
      value: "sendgrid",
      label: "SendGrid",
      notYetWired: true,
      fields: [{ key: "API_KEY", label: "API Key", placeholder: "SG...." }],
    },
  ],
  SMS: [
    {
      value: "termii",
      label: "Termii",
      notYetWired: true,
      fields: [{ key: "API_KEY", label: "API Key" }],
    },
    {
      value: "twilio",
      label: "Twilio",
      notYetWired: true,
      fields: [
        { key: "ACCOUNT_SID", label: "Account SID" },
        { key: "AUTH_TOKEN", label: "Auth Token" },
      ],
    },
  ],
  AI: [
    {
      value: "openai",
      label: "OpenAI",
      notYetWired: true,
      fields: [{ key: "API_KEY", label: "API Key", placeholder: "sk-..." }],
    },
    {
      value: "anthropic",
      label: "Anthropic",
      notYetWired: true,
      fields: [{ key: "API_KEY", label: "API Key", placeholder: "sk-ant-..." }],
    },
  ],
};

export function findProviderSpec(category: IntegrationCategory, provider: string): ProviderSpec | undefined {
  return PROVIDER_CATALOG[category]?.find((spec) => spec.value === provider);
}
