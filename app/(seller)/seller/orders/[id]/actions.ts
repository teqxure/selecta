"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { advanceOrderStatusAsSeller } from "@/services/orders/order.service";
import { setDeliveryDetails } from "@/services/logistics/delivery.service";
import { ROUTES } from "@/lib/constants/routes";
import type { OrderStatus, DeliveryMethod } from "@/generated/prisma/enums";

export async function advanceOrderStatusAction(formData: FormData) {
  const session = await requireRole(Role.SELLER);
  const orderId = String(formData.get("orderId"));
  const nextStatus = String(formData.get("nextStatus")) as OrderStatus;

  await advanceOrderStatusAsSeller(orderId, session.userId, nextStatus);
  revalidatePath(ROUTES.seller.order(orderId));
  revalidatePath(ROUTES.seller.orders);
}

export async function setDeliveryDetailsAction(formData: FormData) {
  const session = await requireRole(Role.SELLER);
  const orderId = String(formData.get("orderId"));
  const deliveryFee = String(formData.get("deliveryFee") || "");

  await setDeliveryDetails(orderId, session.userId, {
    method: String(formData.get("method")) as DeliveryMethod,
    pickupLocation: String(formData.get("pickupLocation") || "") || null,
    deliveryFee: deliveryFee ? Number(deliveryFee) : null,
  });
  revalidatePath(ROUTES.seller.order(orderId));
}
