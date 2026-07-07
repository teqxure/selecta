"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { assertCartItemsStillAvailable, clearCart } from "@/services/products/cart.service";
import { listAddresses } from "@/services/users/address.service";
import { createOrder } from "@/services/orders/order.service";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";

export interface CheckoutActionState {
  error?: string;
}

export async function checkoutAction(_prevState: CheckoutActionState): Promise<CheckoutActionState> {
  const session = await requireAuth();

  try {
    const items = await assertCartItemsStillAvailable(session.userId);
    if (items.length === 0) return { error: "Your cart is empty" };

    const addresses = await listAddresses(session.userId);
    const address = addresses.find((a) => a.isDefault) ?? addresses[0];
    if (!address) return { error: "Add a delivery address to your profile before checking out" };

    await createOrder(
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
    await clearCart(session.userId);
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  redirect(ROUTES.orders);
}
