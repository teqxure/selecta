import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * AES-256-GCM at rest for integration secrets (Paystack/Flutterwave keys,
 * SMS/email provider tokens, etc.) — the one class of data in this app that
 * must never be readable directly from a database dump. Never used for
 * passwords (those are hashed, one-way, via bcrypt in lib/auth/password.ts)
 * — this is specifically for values we must later decrypt to actually call
 * a provider's API.
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM's recommended nonce size

function getKey() {
  const key = Buffer.from(env.SETTINGS_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("SETTINGS_ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded)");
  }
  return key;
}

/** Returns a single packed base64 string: iv (12b) + authTag (16b) + ciphertext. */
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(packed: string): string {
  const raw = Buffer.from(packed, "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = raw.subarray(IV_LENGTH + 16);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** For UI display only — never round-trippable back to the real value. */
export function maskSecret(plainText: string): string {
  const visible = plainText.slice(-4);
  const hidden = "*".repeat(Math.max(plainText.length - 4, 8));
  return `${hidden}${visible}`;
}
