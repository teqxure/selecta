"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { adminSetOrderStatus } from "@/services/orders/order.service";
import { releaseTransaction, refundTransaction } from "@/services/payments/payment.service";
import { ROUTES } from "@/lib/constants/routes";
import type { OrderStatus } from "@/generated/prisma/enums";

export async function adminSetOrderStatusAction(formData: FormData) {
  const admin = await requirePermission("orders.manage");
  const orderId = String(formData.get("orderId"));
  const nextStatus = String(formData.get("nextStatus")) as OrderStatus;
  const note = String(formData.get("note") || "") || undefined;

  await adminSetOrderStatus(orderId, admin.id, nextStatus, note);
  revalidatePath(ROUTES.admin.order(orderId));
}

export async function releaseTransactionAction(formData: FormData) {
  const admin = await requirePermission("orders.manage");
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await releaseTransaction(transactionId, admin.id);
  revalidatePath(ROUTES.admin.order(orderId));
}

export async function refundTransactionAction(formData: FormData) {
  const admin = await requirePermission("orders.manage");
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await refundTransaction(transactionId, admin.id);
  revalidatePath(ROUTES.admin.order(orderId));
}
