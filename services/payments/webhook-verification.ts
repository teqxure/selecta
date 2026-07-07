import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Paystack signs the raw request body with HMAC SHA512 using your secret key. */
export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null, secretKey: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
  return safeEqual(expected, signatureHeader);
}

/** Flutterwave sends back the exact secret hash you configured in their dashboard — a direct compare, not an HMAC. */
export function verifyFlutterwaveSignature(receivedHash: string | null, configuredSecretHash: string): boolean {
  if (!receivedHash) return false;
  return safeEqual(configuredSecretHash, receivedHash);
}
