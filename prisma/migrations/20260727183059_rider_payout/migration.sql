-- AlterEnum
ALTER TYPE "LedgerEntryType" ADD VALUE 'RIDER_PAYOUT_EARNED';

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "rider_payout_percentage" INTEGER NOT NULL DEFAULT 70;

