import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { LedgerEntryType } from "@/generated/prisma/enums";

/**
 * The append-only financial journal. Every function here only ever
 * INSERTs — there is deliberately no update/delete exported from this
 * module. A correction to a past entry is made by recording a new,
 * offsetting entry (see recordAdjustment), never by editing history.
 *
 * Every recorder takes a `db` or an open `Prisma.TransactionClient` so it
 * can be written atomically alongside the balance mutation it documents
 * (e.g. inside the same $transaction that increments Wallet.balance) —
 * that's what makes the ledger trustworthy: it can never observe a
 * balance change that isn't also reflected here, or vice versa.
 */
type DbOrTx = typeof db | Prisma.TransactionClient;

export interface LedgerEntryInput {
  amount: number;
  currency?: string;
  reference?: string;
  userId?: string;
  sellerId?: string;
  orderId?: string;
  paymentId?: string;
  transactionId?: string;
  withdrawalId?: string;
  actorId?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

function record(tx: DbOrTx, type: LedgerEntryType, input: LedgerEntryInput) {
  return tx.ledgerEntry.create({
    data: {
      type,
      amount: input.amount,
      currency: input.currency ?? "NGN",
      reference: input.reference,
      userId: input.userId,
      sellerId: input.sellerId,
      orderId: input.orderId,
      paymentId: input.paymentId,
      transactionId: input.transactionId,
      withdrawalId: input.withdrawalId,
      actorId: input.actorId,
      note: input.note,
      metadata: input.metadata as object | undefined,
    },
  });
}

/** A buyer's payment clearing (escrow hold) — positive, contributes to GMV. Recorded once per seller-transaction. */
export function recordCustomerPayment(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "CUSTOMER_PAYMENT", input);
}

/** Platform's commission cut, realized at escrow release (not at initial hold) — positive, contributes to platform revenue. */
export function recordCommissionEarned(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "COMMISSION_EARNED", input);
}

/** A seller's net proceeds moving from escrow into their available balance — positive. */
export function recordVendorCredit(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "VENDOR_CREDIT", input);
}

/** A withdrawal reserving funds out of available balance — negative. */
export function recordWithdrawalRequest(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "WITHDRAWAL_REQUEST", { ...input, amount: -Math.abs(input.amount) });
}

/** A withdrawal actually completed (funds left the platform) — positive; the historical "completed payouts" figure. */
export function recordWithdrawalPaid(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "WITHDRAWAL_PAID", input);
}

/** Reverses a CUSTOMER_PAYMENT — negative, nets out of GMV/held figures. */
export function recordRefund(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "REFUND", { ...input, amount: -Math.abs(input.amount) });
}

/** Manual correction (rejected-withdrawal reversal, Super Admin balance fix) — signed, positive credits, negative debits. */
export function recordAdjustment(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "ADJUSTMENT", input);
}

/** A seller's subscription payment clearing — positive, 100% platform revenue (no seller split, unlike commission). */
export function recordSubscriptionRevenue(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "SUBSCRIPTION_REVENUE", input);
}

/** A seller paying cash for a boost campaign — positive, 100% platform revenue. */
export function recordBoostRevenue(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "BOOST_REVENUE", input);
}

/** The delivery-fee portion of a buyer's payment — positive, 100% platform/logistics revenue, no seller split. */
export function recordDeliveryFeeRevenue(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "DELIVERY_FEE_REVENUE", input);
}

/** A rider's cut of a delivery fee, credited on confirmed delivery — positive, from the rider's perspective this is their earnings. */
export function recordRiderPayoutEarned(tx: DbOrTx, input: LedgerEntryInput) {
  return record(tx, "RIDER_PAYOUT_EARNED", input);
}

/**
 * Seller-facing history only — excludes COMMISSION_EARNED at the query
 * level (not just at display) since sellers must never see the platform's
 * cut broken out as a line item, only their own gross/net movements.
 * Admin views needing the full picture (including commission) should query
 * ledgerEntry directly rather than reuse this function.
 */
export function listLedgerEntriesForSeller(sellerId: string, take = 50) {
  return db.ledgerEntry.findMany({
    where: { sellerId, type: { not: "COMMISSION_EARNED" } },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/** Rider-facing history — riders have no platform-cut concern like sellers do, so no type is excluded. */
export function listLedgerEntriesForRider(userId: string, take = 50) {
  return db.ledgerEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
}

/** What a seller has actually paid the platform for subscriptions/boosts — lifetime, summed from the ledger, never a mutable counter. */
export async function getSellerMonetizationSpend(sellerId: string) {
  const [subscriptionAgg, boostAgg] = await Promise.all([
    db.ledgerEntry.aggregate({ where: { sellerId, type: "SUBSCRIPTION_REVENUE" }, _sum: { amount: true } }),
    db.ledgerEntry.aggregate({ where: { sellerId, type: "BOOST_REVENUE" }, _sum: { amount: true } }),
  ]);
  return {
    subscriptionSpend: Number(subscriptionAgg._sum.amount ?? 0),
    boostSpend: Number(boostAgg._sum.amount ?? 0),
  };
}

export function listLedgerEntriesForOrder(orderId: string) {
  return db.ledgerEntry.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
}
