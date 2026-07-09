import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins, LARGE_WITHDRAWAL_THRESHOLD_NGN } from "@/services/notifications/admin-alerts.service";
import { recordWithdrawalRequest, recordWithdrawalPaid, recordAdjustment } from "@/services/finance/ledger.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

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
 * simply records it as withdrawn, since the balance was already debited
 * here.
 *
 * The balance check and the decrement are a single conditional
 * `updateMany` (`balance: { gte: amount }` in the WHERE clause), not a
 * separate read-then-write — Postgres evaluates that condition against
 * the row's live value at lock-acquisition time, so two concurrent
 * requests against the same balance can never both succeed and drive it
 * negative. Whichever loses sees `count === 0` and fails cleanly.
 */
export async function requestWithdrawal(userId: string, sellerId: string, input: WithdrawalRequestInput) {
  if (input.amount <= 0) throw new ValidationError("Withdrawal amount must be greater than zero");

  const sellerProfile = await db.sellerProfile.findFirst({ where: { id: sellerId, userId } });
  if (!sellerProfile) throw new NotFoundError("Seller profile");

  return db.$transaction(async (tx) => {
    const claim = await tx.wallet.updateMany({
      where: { userId: sellerProfile.userId, balance: { gte: input.amount } },
      data: { balance: { decrement: input.amount } },
    });
    if (claim.count === 0) {
      throw new ValidationError("Withdrawal amount exceeds your available balance");
    }

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

    await recordWithdrawalRequest(tx, {
      amount: input.amount,
      userId: sellerProfile.userId,
      sellerId,
      withdrawalId: withdrawal.id,
      note: "Withdrawal requested, reserved from available balance",
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
  }).then(async (withdrawal) => {
    await notify({
      event: "WITHDRAWAL_REQUESTED",
      userId: sellerProfile.userId,
      title: "Withdrawal requested",
      message: `Your withdrawal request of ${formatNaira(input.amount)} has been submitted for review.`,
      actionUrl: "/seller/withdrawals",
      emailVariables: { amount: formatNaira(input.amount), status: "requested" },
    });

    if (input.amount >= LARGE_WITHDRAWAL_THRESHOLD_NGN) {
      await alertAdmins(
        "Large withdrawal requested",
        `${sellerProfile.businessName} requested a withdrawal of ${formatNaira(input.amount)}.`,
        { actionUrl: "/admin/withdrawals", metadata: { withdrawalId: withdrawal.id, amount: input.amount } },
      );
    }

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
    const claim = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: "REQUESTED" },
      data: { status: "PROCESSING" },
    });
    if (claim.count === 0) throw new ValidationError("Only requested withdrawals can move to processing");

    const updated = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "WITHDRAWAL_PROCESSING", entityType: "Withdrawal", entityId: withdrawalId },
    });

    return updated;
  });
}

/** Approves a withdrawal — the reservation made at request time becomes a permanent, recorded payout. */
export async function approveWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ["REQUESTED", "PROCESSING"] } },
      data: { status: "PAID", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });
    if (claim.count === 0) throw new ValidationError("This withdrawal has already been paid or rejected");

    const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: withdrawal.sellerId } });

    await tx.wallet.update({
      where: { userId: sellerProfile.userId },
      data: { withdrawnBalance: { increment: Number(withdrawal.amount) } },
    });

    await recordWithdrawalPaid(tx, {
      amount: Number(withdrawal.amount),
      userId: sellerProfile.userId,
      sellerId: withdrawal.sellerId,
      withdrawalId: withdrawal.id,
      actorId: adminId,
      note: "Withdrawal paid out",
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

    return { updated: withdrawal, sellerUserId: sellerProfile.userId };
  });

  const amount = formatNaira(Number(result.updated.amount));
  await notify({
    event: "WITHDRAWAL_APPROVED",
    userId: result.sellerUserId,
    title: "Withdrawal paid",
    message: `${amount} has been sent to your bank account.`,
    actionUrl: "/seller/withdrawals",
    emailVariables: { amount, status: "paid" },
  });

  return result.updated;
}

/** Rejects a withdrawal and restores the reserved amount to the seller's available balance. */
export async function rejectWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.withdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ["REQUESTED", "PROCESSING"] } },
      data: { status: "REJECTED", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });
    if (claim.count === 0) throw new ValidationError("This withdrawal has already been paid or rejected");

    const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    const sellerProfile = await tx.sellerProfile.findUniqueOrThrow({ where: { id: withdrawal.sellerId } });

    await tx.wallet.update({
      where: { userId: sellerProfile.userId },
      data: { balance: { increment: Number(withdrawal.amount) } },
    });

    await recordAdjustment(tx, {
      amount: Number(withdrawal.amount),
      userId: sellerProfile.userId,
      sellerId: withdrawal.sellerId,
      withdrawalId: withdrawal.id,
      actorId: adminId,
      note: "Withdrawal rejected — reservation returned to available balance",
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

    return { updated: withdrawal, sellerUserId: sellerProfile.userId };
  });

  const amount = formatNaira(Number(result.updated.amount));
  await notify({
    event: "WITHDRAWAL_REJECTED",
    userId: result.sellerUserId,
    title: "Withdrawal rejected",
    message: `Your withdrawal request of ${amount} was rejected and the amount has been returned to your available balance.`,
    actionUrl: "/seller/withdrawals",
    emailVariables: { amount, status: "rejected" },
  });

  return result.updated;
}
