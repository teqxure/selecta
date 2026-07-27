"use server";

import { requireAuth } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { Role } from "@/lib/constants/roles";
import { getDeliveryTracking } from "@/services/logistics/delivery.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

/**
 * The single fetch every polling <DeliveryTrackingPanel> instance calls
 * (buyer order page, seller order page, HQ live-ops view) — ownership is
 * re-checked on every call since this is reachable directly from a client
 * component, not gated behind a page-level requireAuth alone.
 */
export async function getDeliveryTrackingAction(orderId: string) {
  const session = await requireAuth();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { include: { seller: true } } } } },
  });
  if (!order) throw new NotFoundError("Order");

  const isBuyer = order.buyerId === session.userId;
  const isSeller = order.items.some((item) => item.product.seller.userId === session.userId);
  const isAdmin = session.role === Role.ADMIN || session.role === Role.SUPER_ADMIN;
  if (!isBuyer && !isSeller && !isAdmin) throw new ForbiddenError();

  return getDeliveryTracking(orderId);
}
