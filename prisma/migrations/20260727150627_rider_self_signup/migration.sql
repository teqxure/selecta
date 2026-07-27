-- CreateEnum
CREATE TYPE "RiderVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "rider_profiles" ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "verification_status" "RiderVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "rider_verifications" (
    "id" TEXT NOT NULL,
    "rider_profile_id" TEXT NOT NULL,
    "id_document_url" TEXT,
    "license_document_url" TEXT,
    "vehicle_photo_url" TEXT,
    "status" "RiderVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" TEXT,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "rider_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rider_verifications_rider_profile_id_key" ON "rider_verifications"("rider_profile_id");

-- CreateIndex
CREATE INDEX "rider_verifications_status_idx" ON "rider_verifications"("status");

-- AddForeignKey
ALTER TABLE "rider_verifications" ADD CONSTRAINT "rider_verifications_rider_profile_id_fkey" FOREIGN KEY ("rider_profile_id") REFERENCES "rider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

