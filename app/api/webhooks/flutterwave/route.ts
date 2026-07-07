import { db } from "@/lib/db";
import { getIntegrationSettingByProvider, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { verifyFlutterwaveSignature } from "@/services/payments/webhook-verification";
import { confirmPaymentSuccess, markPaymentFailed } from "@/services/payments/payment.service";

export const runtime = "nodejs";

/**
 * Flutterwave webhook — verified via the "verif-hash" header, a secret
 * hash you configure once in the Flutterwave dashboard (a direct compare,
 * not an HMAC over the body). `tx_ref` is our own Payment id, set when we
 * initiated the transaction, so it's the lookup key back to our records.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const receivedHash = request.headers.get("verif-hash");

  const setting = await getIntegrationSettingByProvider("PAYMENT", "flutterwave");
  if (!setting || !setting.isEnabled) {
    return new Response("Flutterwave is not configured", { status: 400 });
  }

  let secretHash: string;
  try {
    secretHash = await getDecryptedSecret(setting.id, "SECRET_HASH");
  } catch {
    return new Response("Flutterwave secret hash is not configured", { status: 400 });
  }

  if (!verifyFlutterwaveSignature(receivedHash, secretHash)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    data: { tx_ref: string; flw_ref: string; status: string; amount: number };
  };

  const payment = await db.payment.findUnique({ where: { id: event.data.tx_ref } });
  if (!payment) {
    return new Response("Unknown payment reference", { status: 404 });
  }

  if (event.data.status !== "successful") {
    await markPaymentFailed(payment.id);
    return new Response("Acknowledged", { status: 200 });
  }

  if (Number(event.data.amount) !== Number(payment.amount)) {
    return new Response("Amount mismatch", { status: 400 });
  }

  await confirmPaymentSuccess(payment.id, event.data.flw_ref);
  return new Response("Acknowledged", { status: 200 });
}
