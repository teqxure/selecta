
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoostGoal" AS ENUM ('VIEWS', 'SAVES', 'SALES');

-- CreateEnum
CREATE TYPE "BoostStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MonetizationPurpose" AS ENUM ('SUBSCRIPTION', 'BOOST');

-- CreateEnum
CREATE TYPE "MonetizationPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "GrowthApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'SUBSCRIPTION_REVENUE';
ALTER TYPE "LedgerEntryType" ADD VALUE 'BOOST_REVENUE';

-- AlterTable
ALTER TABLE "system_settings" ADD COLUMN     "boost_price_per_day" DECIMAL(10,2) NOT NULL DEFAULT 500;

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "monthly_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "max_products" INTEGER,
    "boost_credits_per_cycle" INTEGER NOT NULL DEFAULT 0,
    "has_analytics_access" BOOLEAN NOT NULL DEFAULT false,
    "has_featured_store" BOOLEAN NOT NULL DEFAULT false,
    "has_priority_support" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_subscriptions" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "boost_credits_remaining" INTEGER NOT NULL DEFAULT 0,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boost_campaigns" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "goal" "BoostGoal" NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "credits_cost" INTEGER NOT NULL,
    "status" "BoostStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boost_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monetization_payments" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "purpose" "MonetizationPurpose" NOT NULL,
    "subscription_id" TEXT,
    "boost_campaign_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL,
    "provider_reference" TEXT,
    "status" "MonetizationPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monetization_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_partner_applications" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "status" "GrowthApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "assigned_manager_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_partner_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_name_key" ON "subscription_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "subscription_plans_is_active_idx" ON "subscription_plans"("is_active");

-- CreateIndex
CREATE INDEX "seller_subscriptions_seller_id_status_idx" ON "seller_subscriptions"("seller_id", "status");

-- CreateIndex
CREATE INDEX "seller_subscriptions_status_expires_at_idx" ON "seller_subscriptions"("status", "expires_at");

-- CreateIndex
CREATE INDEX "boost_campaigns_seller_id_idx" ON "boost_campaigns"("seller_id");

-- CreateIndex
CREATE INDEX "boost_campaigns_product_id_status_idx" ON "boost_campaigns"("product_id", "status");

-- CreateIndex
CREATE INDEX "boost_campaigns_status_end_date_idx" ON "boost_campaigns"("status", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "monetization_payments_provider_reference_key" ON "monetization_payments"("provider_reference");

-- CreateIndex
CREATE INDEX "monetization_payments_seller_id_idx" ON "monetization_payments"("seller_id");

-- CreateIndex
CREATE INDEX "monetization_payments_status_idx" ON "monetization_payments"("status");

-- CreateIndex
CREATE INDEX "growth_partner_applications_seller_id_idx" ON "growth_partner_applications"("seller_id");

-- CreateIndex
CREATE INDEX "growth_partner_applications_status_idx" ON "growth_partner_applications"("status");

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_campaigns" ADD CONSTRAINT "boost_campaigns_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boost_campaigns" ADD CONSTRAINT "boost_campaigns_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monetization_payments" ADD CONSTRAINT "monetization_payments_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monetization_payments" ADD CONSTRAINT "monetization_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "seller_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monetization_payments" ADD CONSTRAINT "monetization_payments_boost_campaign_id_fkey" FOREIGN KEY ("boost_campaign_id") REFERENCES "boost_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_partner_applications" ADD CONSTRAINT "growth_partner_applications_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_partner_applications" ADD CONSTRAINT "growth_partner_applications_assigned_manager_id_fkey" FOREIGN KEY ("assigned_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

