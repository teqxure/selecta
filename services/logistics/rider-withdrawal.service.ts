import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notifications/notify.service";
import { alertAdmins, LARGE_WITHDRAWAL_THRESHOLD_NGN } from "@/services/notifications/admin-alerts.service";
import { recordWithdrawalRequest, recordWithdrawalPaid, recordAdjustment } from "@/services/finance/ledger.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Mirrors services/payments/withdrawal.service.ts exactly, for riders
 * instead of sellers — same Wallet-reservation pattern (Wallet is already
 * userId-keyed, not seller-specific), same min/max SystemSettings check,
 * same ledger/audit/notification shape. A parallel RiderWithdrawal table
 * rather than overloading the seller-FK'd Withdrawal model.
 */

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export interface RiderWithdrawalRequestInput {
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export async function requestRiderWithdrawal(userId: string, riderProfileId: string, input: RiderWithdrawalRequestInput) {
  if (input.amount <= 0) throw new ValidationError("Withdrawal amount must be greater than zero");

  const settings = await db.systemSettings.findUnique({ where: { id: "singleton" } });
  const minAmount = Number(settings?.minWithdrawalAmount ?? 0);
  const maxAmount = settings?.maxWithdrawalAmount != null ? Number(settings.maxWithdrawalAmount) : null;
  if (input.amount < minAmount) throw new ValidationError(`The minimum withdrawal amount is ${formatNaira(minAmount)}`);
  if (maxAmount !== null && input.amount > maxAmount) throw new ValidationError(`The maximum withdrawal amount is ${formatNaira(maxAmount)}`);

  const riderProfile = await db.riderProfile.findFirst({ where: { id: riderProfileId, userId } });
  if (!riderProfile) throw new NotFoundError("Rider profile");
  if (riderProfile.verificationStatus !== "VERIFIED") {
    throw new ValidationError("Your account must be verified before you can withdraw");
  }

  return db
    .$transaction(async (tx) => {
      const claim = await tx.wallet.updateMany({
        where: { userId: riderProfile.userId, balance: { gte: input.amount } },
        data: { balance: { decrement: input.amount } },
      });
      if (claim.count === 0) {
        throw new ValidationError("Withdrawal amount exceeds your available balance");
      }

      const withdrawal = await tx.riderWithdrawal.create({
        data: {
          riderProfileId,
          amount: input.amount,
          bankName: input.bankName,
          accountNumber: input.accountNumber,
          accountName: input.accountName,
          status: "REQUESTED",
        },
      });

      await recordWithdrawalRequest(tx, {
        amount: input.amount,
        userId: riderProfile.userId,
        withdrawalId: withdrawal.id,
        note: "Rider withdrawal requested, reserved from available balance",
      });

      await tx.auditLog.create({
        data: {
          actorId: riderProfile.userId,
          action: "RIDER_WITHDRAWAL_REQUESTED",
          entityType: "RiderWithdrawal",
          entityId: withdrawal.id,
          metadata: { amount: input.amount } as object,
        },
      });

      return withdrawal;
    })
    .then(async (withdrawal) => {
      await notify({
        event: "WITHDRAWAL_REQUESTED",
        userId: riderProfile.userId,
        title: "Withdrawal requested",
        message: `Your withdrawal request of ${formatNaira(input.amount)} has been submitted for review.`,
        actionUrl: "/rider/withdrawals",
        emailVariables: { amount: formatNaira(input.amount), status: "requested" },
      });

      if (input.amount >= LARGE_WITHDRAWAL_THRESHOLD_NGN) {
        await alertAdmins(
          "Large rider withdrawal requested",
          `${riderProfile.userId} requested a withdrawal of ${formatNaira(input.amount)}.`,
          { actionUrl: "/admin/logistics/rider-withdrawals", metadata: { withdrawalId: withdrawal.id, amount: input.amount } },
        );
      }

      return withdrawal;
    });
}

export function listRiderWithdrawals(riderProfileId: string) {
  return db.riderWithdrawal.findMany({ where: { riderProfileId }, orderBy: { requestedAt: "desc" } });
}

export function listRiderWithdrawalRequests(status?: "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED") {
  return db.riderWithdrawal.findMany({
    where: status ? { status } : undefined,
    include: { riderProfile: { include: { user: true } } },
    orderBy: { requestedAt: "desc" },
  });
}

export async function markRiderWithdrawalProcessing(adminId: string, withdrawalId: string) {
  return db.$transaction(async (tx) => {
    const claim = await tx.riderWithdrawal.updateMany({
      where: { id: withdrawalId, status: "REQUESTED" },
      data: { status: "PROCESSING" },
    });
    if (claim.count === 0) throw new ValidationError("Only requested withdrawals can move to processing");

    const updated = await tx.riderWithdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "RIDER_WITHDRAWAL_PROCESSING", entityType: "RiderWithdrawal", entityId: withdrawalId },
    });
    return updated;
  });
}

export async function approveRiderWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.riderWithdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ["REQUESTED", "PROCESSING"] } },
      data: { status: "PAID", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });
    if (claim.count === 0) throw new ValidationError("This withdrawal has already been paid or rejected");

    const withdrawal = await tx.riderWithdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    const riderProfile = await tx.riderProfile.findUniqueOrThrow({ where: { id: withdrawal.riderProfileId } });

    await tx.wallet.update({
      where: { userId: riderProfile.userId },
      data: { withdrawnBalance: { increment: Number(withdrawal.amount) } },
    });

    await recordWithdrawalPaid(tx, {
      amount: Number(withdrawal.amount),
      userId: riderProfile.userId,
      withdrawalId: withdrawal.id,
      actorId: adminId,
      note: "Rider withdrawal paid out",
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "RIDER_WITHDRAWAL_APPROVED",
        entityType: "RiderWithdrawal",
        entityId: withdrawalId,
        metadata: { amount: Number(withdrawal.amount) } as object,
      },
    });

    return { updated: withdrawal, riderUserId: riderProfile.userId };
  });

  const amount = formatNaira(Number(result.updated.amount));
  await notify({
    event: "WITHDRAWAL_APPROVED",
    userId: result.riderUserId,
    title: "Withdrawal paid",
    message: `${amount} has been sent to your bank account.`,
    actionUrl: "/rider/withdrawals",
    emailVariables: { amount, status: "paid" },
  });

  return result.updated;
}

export async function rejectRiderWithdrawal(adminId: string, withdrawalId: string, reviewNotes?: string) {
  const result = await db.$transaction(async (tx) => {
    const claim = await tx.riderWithdrawal.updateMany({
      where: { id: withdrawalId, status: { in: ["REQUESTED", "PROCESSING"] } },
      data: { status: "REJECTED", reviewedById: adminId, reviewNotes, processedAt: new Date() },
    });
    if (claim.count === 0) throw new ValidationError("This withdrawal has already been paid or rejected");

    const withdrawal = await tx.riderWithdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    const riderProfile = await tx.riderProfile.findUniqueOrThrow({ where: { id: withdrawal.riderProfileId } });

    await tx.wallet.update({
      where: { userId: riderProfile.userId },
      data: { balance: { increment: Number(withdrawal.amount) } },
    });

    await recordAdjustment(tx, {
      amount: Number(withdrawal.amount),
      userId: riderProfile.userId,
      withdrawalId: withdrawal.id,
      actorId: adminId,
      note: "Rider withdrawal rejected — reservation returned to available balance",
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "RIDER_WITHDRAWAL_REJECTED",
        entityType: "RiderWithdrawal",
        entityId: withdrawalId,
        metadata: { amount: Number(withdrawal.amount), reviewNotes } as object,
      },
    });

    return { updated: withdrawal, riderUserId: riderProfile.userId };
  });

  const amount = formatNaira(Number(result.updated.amount));
  await notify({
    event: "WITHDRAWAL_REJECTED",
    userId: result.riderUserId,
    title: "Withdrawal rejected",
    message: `Your withdrawal request of ${amount} was rejected and the amount has been returned to your available balance.`,
    actionUrl: "/rider/withdrawals",
    emailVariables: { amount, status: "rejected" },
  });

  return result.updated;
}
