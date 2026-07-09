
-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN     "agreement_accepted_at" TIMESTAMP(3),
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "social_links" JSONB;

