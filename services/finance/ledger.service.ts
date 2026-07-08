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

export function listLedgerEntriesForSeller(sellerId: string, take = 50) {
  return db.ledgerEntry.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, take });
}

export function listLedgerEntriesForOrder(orderId: string) {
  return db.ledgerEntry.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
}
