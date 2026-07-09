import { db } from "@/lib/db";
import { getIntegrationSettingByProvider, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { verifyPaystackSignature } from "@/services/payments/webhook-verification";
import { confirmPaymentSuccess, markPaymentFailed } from "@/services/payments/payment.service";
import { confirmSubscriptionPayment, markSubscriptionPaymentFailed } from "@/services/monetization/subscription.service";
import { confirmBoostPayment, markBoostPaymentFailed } from "@/services/monetization/boost.service";

export const runtime = "nodejs";

/**
 * Paystack webhook — the only path that may move a Payment or
 * MonetizationPayment out of PENDING. The reference we sent Paystack at
 * checkout time is always our own row id (whichever table initiated the
 * charge), so `data.reference` here is exactly the row to look up. Order
 * payments and subscription/boost payments are separate tables (see
 * MonetizationPayment's doc comment in schema.prisma) — this checks Payment
 * first since it's the higher-volume path, then falls back to
 * MonetizationPayment. Signature verification happens over the raw body, so
 * it's read as text before any JSON parsing — parsing and re-serializing
 * would change the byte-for-byte content Paystack signed.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const setting = await getIntegrationSettingByProvider("PAYMENT", "paystack");
  if (!setting || !setting.isEnabled) {
    return new Response("Paystack is not configured", { status: 400 });
  }

  let secretKey: string;
  try {
    secretKey = await getDecryptedSecret(setting.id, "SECRET_KEY");
  } catch {
    return new Response("Paystack secret key is not configured", { status: 400 });
  }

  if (!verifyPaystackSignature(rawBody, signature, secretKey)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody) as { event: string; data: { reference: string; status: string; amount: number } };

  if (event.event !== "charge.success" && event.event !== "charge.failed") {
    return new Response("Ignored", { status: 200 });
  }

  const payment = await db.payment.findUnique({ where: { id: event.data.reference } });
  if (payment) {
    if (event.event === "charge.failed") {
      await markPaymentFailed(payment.id);
      return new Response("Acknowledged", { status: 200 });
    }

    // Defense in depth beyond the signature check: the charged amount must
    // match what we recorded when the payment was initiated.
    const chargedAmount = event.data.amount / 100;
    if (event.data.status !== "success" || chargedAmount !== Number(payment.amount)) {
      return new Response("Amount or status mismatch", { status: 400 });
    }

    await confirmPaymentSuccess(payment.id, event.data.reference);
    return new Response("Acknowledged", { status: 200 });
  }

  const monetizationPayment = await db.monetizationPayment.findUnique({ where: { id: event.data.reference } });
  if (!monetizationPayment) {
    return new Response("Unknown payment reference", { status: 404 });
  }

  if (event.event === "charge.failed") {
    if (monetizationPayment.purpose === "SUBSCRIPTION") await markSubscriptionPaymentFailed(monetizationPayment.id);
    else await markBoostPaymentFailed(monetizationPayment.id);
    return new Response("Acknowledged", { status: 200 });
  }

  const chargedAmount = event.data.amount / 100;
  if (event.data.status !== "success" || chargedAmount !== Number(monetizationPayment.amount)) {
    return new Response("Amount or status mismatch", { status: 400 });
  }

  if (monetizationPayment.purpose === "SUBSCRIPTION") {
    await confirmSubscriptionPayment(monetizationPayment.id, event.data.reference);
  } else {
    await confirmBoostPayment(monetizationPayment.id, event.data.reference);
  }
  return new Response("Acknowledged", { status: 200 });
}
