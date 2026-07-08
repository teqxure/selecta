import "server-only";
import { db } from "@/lib/db";
import { createNotification } from "@/services/notifications/notification.service";
import { recordAdjustment } from "@/services/finance/ledger.service";
import { ValidationError } from "@/lib/errors";

/**
 * Manual, Super-Admin-only correction to a seller's available balance —
 * e.g. compensating a seller for a platform-side mistake, or reversing an
 * over-credit. Deliberately narrow: it only ever touches `balance`, never
 * `totalEarned` (lifetime earnings is defined elsewhere as monotonically
 * increasing — see Wallet's schema comment — so a corrective debit here
 * doesn't rewrite history, it just adjusts what's currently available).
 * A debit is guarded by the same conditional-update pattern as a
 * withdrawal request, so it can never drive the balance negative.
 */
export async function createManualAdjustment(adminId: string, sellerId: string, amount: number, reason: string) {
  if (amount === 0) throw new ValidationError("Adjustment amount cannot be zero");
  if (!reason.trim()) throw new ValidationError("A reason is required for a manual adjustment");

  const sellerProfile = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });

  const wallet = await db.$transaction(async (tx) => {
    if (amount < 0) {
      const claim = await tx.wallet.updateMany({
        where: { userId: sellerProfile.userId, balance: { gte: Math.abs(amount) } },
        data: { balance: { decrement: Math.abs(amount) } },
      });
      if (claim.count === 0) {
        throw new ValidationError("This debit would take the seller's available balance below zero");
      }
    } else {
      await tx.wallet.upsert({
        where: { userId: sellerProfile.userId },
        create: { userId: sellerProfile.userId, balance: amount, totalEarned: amount },
        update: { balance: { increment: amount }, totalEarned: { increment: amount } },
      });
    }

    await recordAdjustment(tx, {
      amount,
      userId: sellerProfile.userId,
      sellerId,
      actorId: adminId,
      note: reason,
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "MANUAL_WALLET_ADJUSTMENT",
        entityType: "Wallet",
        entityId: sellerProfile.userId,
        metadata: { amount, reason, sellerId } as object,
      },
    });

    return tx.wallet.findUniqueOrThrow({ where: { userId: sellerProfile.userId } });
  });

  await createNotification(
    sellerProfile.userId,
    "PAYMENT",
    amount > 0 ? "Your balance was adjusted" : "Your balance was corrected",
    `Selecta ${amount > 0 ? "credited" : "debited"} ₦${Math.abs(amount).toLocaleString("en-NG", { maximumFractionDigits: 2 })}: ${reason}`,
  );

  return wallet;
}
