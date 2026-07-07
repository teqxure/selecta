import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { getPrimaryIntegration, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { initiatePayment, confirmPaymentSuccess, markPaymentFailed } from "@/services/payments/payment.service";
import { initializePaystackTransaction, verifyPaystackTransaction } from "@/services/payments/providers/paystack";
import { initializeFlutterwavePayment, verifyFlutterwaveTransaction } from "@/services/payments/providers/flutterwave";

/**
 * Kicks off payment for a freshly created order: creates the Payment
 * record (PENDING) and returns the hosted checkout URL from whichever
 * provider Super Admin has marked primary at /admin/integrations. No
 * provider name is ever hardcoded as "the" payment method — if none is
 * configured/enabled, this fails loudly rather than silently picking one.
 */
export async function initiateCheckoutForOrder(orderId: string, buyerEmail: string, buyerName: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundError("Order");

  const primary = await getPrimaryIntegration("PAYMENT");
  if (!primary) {
    throw new ConflictError("No payment provider is configured yet — please try again shortly");
  }

  const payment = await initiatePayment(orderId, primary.provider);
  const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}${ROUTES.orders}/${orderId}`;
  const secretKey = await getDecryptedSecret(primary.id, "SECRET_KEY");

  if (primary.provider === "paystack") {
    const { authorizationUrl } = await initializePaystackTransaction(
      { email: buyerEmail, amountNaira: Number(payment.amount), reference: payment.id, callbackUrl },
      secretKey,
    );
    return authorizationUrl;
  }

  if (primary.provider === "flutterwave") {
    const { paymentLink } = await initializeFlutterwavePayment(
      { email: buyerEmail, name: buyerName, amountNaira: Number(payment.amount), txRef: payment.id, redirectUrl: callbackUrl },
      secretKey,
    );
    return paymentLink;
  }

  throw new ConflictError(`Unsupported payment provider: ${primary.provider}`);
}

/**
 * Called when the buyer lands back on the order page after a hosted
 * checkout redirect — a safety net in case the provider's webhook hasn't
 * arrived yet. Pulls the transaction status directly from the provider's
 * own verify API (never trusts the redirect query string), so it's just
 * as trustworthy as the webhook path, just pull- instead of push-driven.
 */
export async function verifyAndSyncPayment(orderId: string) {
  const payment = await db.payment.findUnique({ where: { orderId } });
  if (!payment || payment.status !== "PENDING") return;

  const setting = await getPrimaryIntegration("PAYMENT");
  if (!setting || setting.provider !== payment.provider) return;

  const secretKey = await getDecryptedSecret(setting.id, "SECRET_KEY");

  if (payment.provider === "paystack") {
    const result = await verifyPaystackTransaction(payment.id, secretKey);
    if (result.status === "success" && result.amountNaira === Number(payment.amount)) {
      await confirmPaymentSuccess(payment.id, result.reference);
    } else if (result.status === "failed") {
      await markPaymentFailed(payment.id);
    }
    return;
  }

  if (payment.provider === "flutterwave") {
    const result = await verifyFlutterwaveTransaction(payment.id, secretKey);
    if (result.status === "successful" && result.amountNaira === Number(payment.amount)) {
      await confirmPaymentSuccess(payment.id, result.reference);
    } else if (result.status === "failed") {
      await markPaymentFailed(payment.id);
    }
  }
}
