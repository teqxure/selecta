"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { adminSetOrderStatus } from "@/services/orders/order.service";
import { releaseTransaction, refundTransaction } from "@/services/payments/payment.service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
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

/** If a direct release/refund just settled the order's last escrowed transaction, sync the order-level status to match — best effort, since the order may have already moved on (e.g. the buyer confirmed delivery moments earlier). */
async function syncOrderStatusAfterDirectSettlement(orderId: string, adminId: string, resolutionStatus: "COMPLETED" | "REFUNDED") {
  const stillHeld = await db.transaction.count({ where: { orderId, status: "HELD_IN_ESCROW" } });
  if (stillHeld > 0) return;

  try {
    await adminSetOrderStatus(orderId, adminId, resolutionStatus, "Synced after direct transaction settlement");
  } catch (error) {
    if (!isAppError(error)) throw error;
  }
}

export async function releaseTransactionAction(formData: FormData) {
  const admin = await requirePermission("orders.manage");
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await releaseTransaction(transactionId, admin.id);
  await syncOrderStatusAfterDirectSettlement(orderId, admin.id, "COMPLETED");
  revalidatePath(ROUTES.admin.order(orderId));
}

export async function refundTransactionAction(formData: FormData) {
  const admin = await requirePermission("orders.manage");
  const transactionId = String(formData.get("transactionId"));
  const orderId = String(formData.get("orderId"));

  await refundTransaction(transactionId, admin.id);
  await syncOrderStatusAfterDirectSettlement(orderId, admin.id, "REFUNDED");
  revalidatePath(ROUTES.admin.order(orderId));
}
