
-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PRODUCT_INQUIRY', 'ORDER_SUPPORT', 'DISPUTE_DISCUSSION');

-- CreateEnum
CREATE TYPE "MessageFlagType" AS ENUM ('PHONE_NUMBER', 'EMAIL_ADDRESS', 'WHATSAPP', 'EXTERNAL_PAYMENT', 'SOCIAL_HANDLE', 'BANK_ACCOUNT');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'EXPIRED', 'CANCELLED');

-- DropIndex
DROP INDEX "conversations_buyer_id_seller_profile_id_key";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "dispute_id" TEXT,
ADD COLUMN     "is_archived_by_buyer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_archived_by_seller" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_reported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "order_id" TEXT,
ADD COLUMN     "product_id" TEXT,
ADD COLUMN     "report_reason" TEXT,
ADD COLUMN     "reported_at" TIMESTAMP(3),
ADD COLUMN     "type" "ConversationType" NOT NULL DEFAULT 'PRODUCT_INQUIRY';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "messaging_restricted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "message_flags" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "flag_type" "MessageFlagType" NOT NULL,
    "matched_snippet" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "previous_offer_id" TEXT,
    "order_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_flags_message_id_key" ON "message_flags"("message_id");

-- CreateIndex
CREATE INDEX "message_flags_user_id_created_at_idx" ON "message_flags"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "message_flags_conversation_id_idx" ON "message_flags"("conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_previous_offer_id_key" ON "offers"("previous_offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_order_id_key" ON "offers"("order_id");

-- CreateIndex
CREATE INDEX "offers_conversation_id_idx" ON "offers"("conversation_id");

-- CreateIndex
CREATE INDEX "offers_seller_id_status_idx" ON "offers"("seller_id", "status");

-- CreateIndex
CREATE INDEX "offers_buyer_id_idx" ON "offers"("buyer_id");

-- CreateIndex
CREATE INDEX "conversations_buyer_id_seller_profile_id_type_idx" ON "conversations"("buyer_id", "seller_profile_id", "type");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_flags" ADD CONSTRAINT "message_flags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_previous_offer_id_fkey" FOREIGN KEY ("previous_offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

