import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface WithdrawalRequestInput {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/**
 * Reserves the requested amount out of the seller's available balance
 * immediately (rather than only at approval time) — otherwise a seller
 * could file several overlapping requests against the same balance before
 * any of them are reviewed. Rejection restores the reservation; approval
 * (`processWithdrawal` -> PAID) simply records it as withdrawn, since the
 * balance was already debited here.
 */
export async function requestWithdrawal(sellerId: string, input: WithdrawalRequestInput) {
  if (input.amount <= 0) throw new ValidationError("Withdrawal amount must be greater than zero");

  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });

  return db.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId: sellerProfile.userId } });
    if (!wallet || Number(wallet.balance) < input.amount) {
      throw new ValidationError("Withdrawal amount exceeds your available balance");
    }

    await tx.wallet.update({ where: { userId: sellerProfile.userId }, data: { balance: { decrement: input.amount } } });

    const withdrawal = await tx.withdrawal.create({
      data: {
        sellerId,
        amount: input.amount,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountName: input.accountName,
        status: "REQUESTED",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: sellerProfile.userId,
        action: "WITHDRAWAL_REQUESTED",
        entityType: "Withdrawal",
        entityId: withdrawal.id,
        metadata: { amount: input.amount } as object,
      },
    });

    return withdrawal;
  });
}

export function listWithdrawalsForSeller(sellerId: string) {
  return db.withdrawal.findMany({ where: { sellerId }, orderBy: { requestedAt: "desc" } });
}

export function listWithdrawalRequests(status?: "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED") {
  return db.withdrawal.findMany({
    where: status ? { status } : undefined,
    include: { seller: { include: { user: true } } },
    orderBy: { requestedAt: "desc" },
  });
}

export async function markWithdrawalProcessing(adminId: string, withdrawalId: string) {
  return db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status !== "REQUESTED") throw new ValidationError("Only requested withdrawals can move to processing");

    const updated = await tx.withdrawal.update({ where: { id: withdrawalId }, data: { status: "PROCESSING" } });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "WITHDRAWAL_PROCESSING", entityType: "Withdrawal", entityId: withdrawalId },
    });

    return updated;
  });
}

/** Approves a withdrawal — the reservation made at request time becomes a permanent, recorded payout. */
export async function approveWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status === "PAID") throw new ValidationError("Withdrawal already paid");
    if (withdrawal.status === "REJECTED") throw new ValidationError("Cannot approve a rejected withdrawal");

    const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: withdrawal.sellerId } });

    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "PAID", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });

    await tx.wallet.update({
      where: { userId: sellerProfile.userId },
      data: { withdrawnBalance: { increment: Number(withdrawal.amount) } },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "WITHDRAWAL_APPROVED",
        entityType: "Withdrawal",
        entityId: withdrawalId,
        metadata: { amount: Number(withdrawal.amount) } as object,
      },
    });

    return { updated, sellerUserId: sellerProfile.userId };
  });

  await createNotification(
    result.sellerUserId,
    "PAYMENT",
    "Withdrawal paid",
    `₦${Number(result.updated.amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })} has been sent to your bank account.`,
  );

  return result.updated;
}

/** Rejects a withdrawal and restores the reserved amount to the seller's available balance. */
export async function rejectWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const withdrawal = await tx.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundError("Withdrawal");
    if (withdrawal.status === "PAID" || withdrawal.status === "REJECTED") {
      throw new ValidationError(`Cannot reject a withdrawal in status ${withdrawal.status}`);
    }

    const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: withdrawal.sellerId } });

    const updated = await tx.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: "REJECTED", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });

    await tx.wallet.update({
      where: { userId: sellerProfile.userId },
      data: { balance: { increment: Number(withdrawal.amount) } },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "WITHDRAWAL_REJECTED",
        entityType: "Withdrawal",
        entityId: withdrawalId,
        metadata: { amount: Number(withdrawal.amount), reviewNotes } as object,
      },
    });

    return { updated, sellerUserId: sellerProfile.userId };
  });

  await createNotification(
    result.sellerUserId,
    "PAYMENT",
    "Withdrawal rejected",
    `Your withdrawal request of ₦${Number(result.updated.amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })} was rejected and the amount has been returned to your available balance.`,
  );

  return result.updated;
}
