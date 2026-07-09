"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { currentUser } from "@/lib/auth/current-user";
import { assertCartItemsStillAvailable, clearCart } from "@/services/products/cart.service";
import { listAddresses } from "@/services/users/address.service";
import { createOrder } from "@/services/orders/order.service";
import { initiateCheckoutForOrder } from "@/services/payments/checkout.service";
import { isAppError, RateLimitError } from "@/lib/errors";
import { checkCheckoutRateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db";

export interface CheckoutActionState {
  error?: string;
}

export async function checkoutAction(_prevState: CheckoutActionState): Promise<CheckoutActionState> {
  const session = await requireAuth();

  let redirectUrl: string;

  try {
    if (!(await checkCheckoutRateLimit(session.userId)).allowed) throw new RateLimitError();

    const items = await assertCartItemsStillAvailable(session.userId);
    if (items.length === 0) return { error: "Your cart is empty" };

    const addresses = await listAddresses(session.userId);
    const address = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (!address) return { error: "Add a delivery address to your profile before checking out" };

    const buyer = await currentUser();
    if (!buyer) return { error: "Your session has expired — please sign in again" };

    const order = await createOrder(
      session.userId,
      items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        city: address.city,
        state: address.state,
        country: address.country,
      },
    );

    try {
      redirectUrl = await initiateCheckoutForOrder(order.id, buyer.email, `${buyer.firstName} ${buyer.lastName}`);
    } catch (error) {
      // Don't leave an orphaned, unpayable order behind — the buyer's cart
      // items are still intact for them to retry.
      await db.order.delete({ where: { id: order.id } });
      throw error;
    }
    await clearCart(session.userId);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(redirectUrl);
}
