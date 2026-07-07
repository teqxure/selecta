import "server-only";
import { ConflictError } from "@/lib/errors";

const BASE_URL = "https://api.flutterwave.com/v3";

interface InitializeInput {
  email: string;
  name: string;
  amountNaira: number;
  txRef: string;
  redirectUrl: string;
}

export async function initializeFlutterwavePayment(input: InitializeInput, secretKey: string) {
  const response = await fetch(`${BASE_URL}/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amountNaira,
      currency: "NGN",
      redirect_url: input.redirectUrl,
      customer: { email: input.email, name: input.name },
    }),
  });

  const json = (await response.json()) as { status: string; message: string; data?: { link: string } };
  if (!response.ok || json.status !== "success" || !json.data) {
    throw new ConflictError(`Flutterwave initialization failed: ${json.message ?? response.statusText}`);
  }

  return { paymentLink: json.data.link };
}

/** Verifies by our own tx_ref (not Flutterwave's internal numeric transaction id). */
export async function verifyFlutterwaveTransaction(txRef: string, secretKey: string) {
  const response = await fetch(`${BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const json = (await response.json()) as {
    status: string;
    data?: { status: string; amount: number; tx_ref: string; flw_ref: string };
  };
  if (!response.ok || json.status !== "success" || !json.data) {
    throw new ConflictError("Flutterwave verification failed");
  }

  return { status: json.data.status, amountNaira: json.data.amount, reference: json.data.flw_ref };
}
