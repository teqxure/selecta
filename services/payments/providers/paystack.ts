import "server-only";
import { ConflictError } from "@/lib/errors";

const BASE_URL = "https://api.paystack.co";

interface InitializeInput {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
}

/** Paystack expects amounts in kobo (naira * 100) and hands back a hosted checkout URL. */
export async function initializePaystackTransaction(input: InitializeInput, secretKey: string) {
  const response = await fetch(`${BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountNaira * 100),
      reference: input.reference,
      callback_url: input.callbackUrl,
    }),
  });

  const json = (await response.json()) as { status: boolean; message: string; data?: { authorization_url: string } };
  if (!response.ok || !json.status || !json.data) {
    throw new ConflictError(`Paystack initialization failed: ${json.message ?? response.statusText}`);
  }

  return { authorizationUrl: json.data.authorization_url };
}

export async function verifyPaystackTransaction(reference: string, secretKey: string) {
  const response = await fetch(`${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const json = (await response.json()) as {
    status: boolean;
    data?: { status: string; amount: number; reference: string };
  };
  if (!response.ok || !json.status || !json.data) {
    throw new ConflictError("Paystack verification failed");
  }

  return { status: json.data.status, amountNaira: json.data.amount / 100, reference: json.data.reference };
}
