"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { currentUser } from "@/lib/auth/current-user";
import { assertCartItemsStillAvailable, clearCart } from "@/services/products/cart.service";
import { getAddressById } from "@/services/users/address.service";
import { createOrder } from "@/services/orders/order.service";
import { initiateCheckoutForOrder } from "@/services/payments/checkout.service";
import { calculateDeliveryQuote, resolveBuyerCoordinates, resolveFulfillmentPrice } from "@/services/logistics/delivery-engine.service";
import { setDeliveryQuote } from "@/services/logistics/delivery.service";
import { validateAndPriceCoupon } from "@/services/marketing/coupon.service";
import { isAppError, RateLimitError, ValidationError } from "@/lib/errors";
import { checkCheckoutRateLimit } from "@/lib/security/rate-limit";
import { db } from "@/lib/db";
import type { DeliveryFulfillmentType } from "@/generated/prisma/enums";

export interface CheckoutActionState {
  error?: string;
}

const VALID_FULFILLMENT_TYPES: DeliveryFulfillmentType[] = ["STANDARD", "EXPRESS", "PICKUP"];

export async function checkoutAction(_prevState: CheckoutActionState, formData: FormData): Promise<CheckoutActionState> {
  const session = await requireAuth();

  let redirectUrl: string;

  try {
    if (!(await checkCheckoutRateLimit(session.userId)).allowed) throw new RateLimitError();

    const items = await assertCartItemsStillAvailable(session.userId);
    if (items.length === 0) return { error: "Your cart is empty" };

    const addressId = String(formData.get("addressId") ?? "");
    if (!addressId) return { error: "Add a delivery address to your profile before checking out" };
    const address = await getAddressById(session.userId, addressId);

    const buyer = await currentUser();
    if (!buyer) return { error: "Your session has expired — please sign in again" };
    const buyerUser = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { latitude: true, longitude: true } });
    const buyerCoords = resolveBuyerCoordinates(address, buyerUser);

    // One delivery quote per seller (Part Ten: bundling multiple items from
    // the same seller into a single delivery fee is a natural byproduct of
    // grouping this way rather than quoting per line item).
    const sellerIds = [...new Set(items.map((item) => item.product.sellerId))];

    let totalDeliveryFee = 0;
    const singleSellerQuote: { quote: Awaited<ReturnType<typeof calculateDeliveryQuote>>; fulfillmentType: DeliveryFulfillmentType; fee: number }[] = [];

    for (const sellerId of sellerIds) {
      const seller = items.find((i) => i.product.sellerId === sellerId)!.product.seller;
      const requested = String(formData.get(`fulfillment_${sellerId}`) ?? "STANDARD");
      const fulfillmentType: DeliveryFulfillmentType = VALID_FULFILLMENT_TYPES.includes(requested as DeliveryFulfillmentType)
        ? (requested as DeliveryFulfillmentType)
        : "STANDARD";

      const quote = await calculateDeliveryQuote({
        sellerCoords: seller.latitude != null && seller.longitude != null ? { latitude: seller.latitude, longitude: seller.longitude } : null,
        buyerCoords,
        sellerCity: seller.city,
        buyerCity: address.city,
      });

      if (fulfillmentType === "PICKUP" && !(quote.pickupEligible && seller.offersPickup)) {
        throw new ValidationError(`Pickup isn't available for ${seller.storeName ?? seller.businessName} for this order`);
      }
      if (fulfillmentType === "EXPRESS" && !quote.expressEligible) {
        throw new ValidationError(`Express delivery isn't available for ${seller.storeName ?? seller.businessName} right now`);
      }

      const fee = resolveFulfillmentPrice(quote, fulfillmentType);
      totalDeliveryFee += fee;
      singleSellerQuote.push({ quote, fulfillmentType, fee });
    }

    const couponCode = String(formData.get("couponCode") || "").trim();
    let discount: { couponId: string; discountAmount: number } | undefined;
    if (couponCode) {
      const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
      const categoryIds = [...new Set(items.map((item) => item.product.categoryId))];
      discount = await validateAndPriceCoupon(couponCode, session.userId, itemsSubtotal, categoryIds);
    }

    const order = await createOrder(
      session.userId,
      items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      {
        line1: address.line1,
        line2: address.line2 ?? undefined,
        city: address.city,
        state: address.state,
        country: address.country,
        area: address.area ?? undefined,
        landmark: address.landmark ?? undefined,
        notes: address.notes ?? undefined,
        latitude: address.latitude ?? undefined,
        longitude: address.longitude ?? undefined,
      },
      totalDeliveryFee,
      discount,
    );

    try {
      // Delivery is 1:1 with Order — only a single-seller cart can have its
      // full quote (distance/zone/ETA) persisted onto that one row today.
      if (sellerIds.length === 1) {
        const { quote, fulfillmentType, fee } = singleSellerQuote[0];
        await setDeliveryQuote(order.id, quote, fulfillmentType, fee);
      }

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
