-- CreateTable
CREATE TABLE "rider_withdrawals" (
    "id" TEXT NOT NULL,
    "rider_profile_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "reviewed_by_id" TEXT,
    "review_notes" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "rider_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rider_withdrawals_rider_profile_id_status_idx" ON "rider_withdrawals"("rider_profile_id", "status");

-- AddForeignKey
ALTER TABLE "rider_withdrawals" ADD CONSTRAINT "rider_withdrawals_rider_profile_id_fkey" FOREIGN KEY ("rider_profile_id") REFERENCES "rider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

