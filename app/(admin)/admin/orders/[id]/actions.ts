"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { adminSetOrderStatus } from "@/services/orders/order.service";
import { releaseTransaction, refundTransaction } from "@/services/payments/payment.service";
import { ROUTES } from "@/lib/constants/routes";
import type { OrderStatus } from "@/generated/prisma/enums";

export async function adminSetOrderStatusAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const orderId = String(formData.get("orderId"));
  const nextStatus = String(formData.get("nextStatus")) as OrderStatus;
  const note = String(formData.get("note") || "") || undefined;

  await adminSetOrderStatus(orderId, session.userId, nextStatus, note);
  revalidatePath(ROUTES.admin.order(orderId));
}

export async function releaseTransactionAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await releaseTransaction(transactionId, session.userId);
  revalidatePath(ROUTES.admin.order(orderId));
}

export async function refundTransactionAction(formData: FormData) {
  const session = await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await refundTransaction(transactionId, session.userId);
  revalidatePath(ROUTES.admin.order(orderId));
}
