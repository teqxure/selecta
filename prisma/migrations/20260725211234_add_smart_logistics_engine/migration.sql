-- CreateEnum
CREATE TYPE "LocationPermissionStatus" AS ENUM ('NOT_ASKED', 'GRANTED', 'DENIED');

-- CreateEnum
CREATE TYPE "DeliveryFulfillmentType" AS ENUM ('STANDARD', 'EXPRESS', 'PICKUP');

-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "area" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location_updated_at" TIMESTAMP(3),
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "distance_km" DOUBLE PRECISION,
ADD COLUMN     "estimated_minutes" INTEGER,
ADD COLUMN     "fulfillment_type" "DeliveryFulfillmentType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "logistics_partner_id" TEXT,
ADD COLUMN     "zone_label" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN     "area" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location_updated_at" TIMESTAMP(3),
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "offers_pickup" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "location_permission" "LocationPermissionStatus" NOT NULL DEFAULT 'NOT_ASKED',
ADD COLUMN     "location_updated_at" TIMESTAMP(3),
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "min_km" DOUBLE PRECISION NOT NULL,
    "max_km" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_delivery_pricing" (
    "id" TEXT NOT NULL,
    "city" TEXT,
    "zone_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_delivery_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logistics_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "coverage_cities" TEXT[],
    "pricing_model" TEXT,
    "estimated_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "notes" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logistics_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_rules" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pickup_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "same_day_radius_km" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "same_day_cutoff_hour" INTEGER NOT NULL DEFAULT 14,
    "max_delivery_distance_km" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "express_available" BOOLEAN NOT NULL DEFAULT true,
    "express_surcharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "emergency_disable_all" BOOLEAN NOT NULL DEFAULT false,
    "emergency_disable_reason" TEXT,
    "updated_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_holidays" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT NOT NULL,
    "disables_same_day" BOOLEAN NOT NULL DEFAULT true,
    "disables_all" BOOLEAN NOT NULL DEFAULT false,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zones_label_key" ON "delivery_zones"("label");

-- CreateIndex
CREATE INDEX "delivery_zones_is_active_idx" ON "delivery_zones"("is_active");

-- CreateIndex
CREATE INDEX "city_delivery_pricing_city_idx" ON "city_delivery_pricing"("city");

-- CreateIndex
CREATE UNIQUE INDEX "city_delivery_pricing_city_zone_id_key" ON "city_delivery_pricing"("city", "zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_partners_name_key" ON "logistics_partners"("name");

-- CreateIndex
CREATE INDEX "logistics_partners_is_active_idx" ON "logistics_partners"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_holidays_date_key" ON "delivery_holidays"("date");

-- CreateIndex
CREATE INDEX "products_latitude_longitude_idx" ON "products"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_logistics_partner_id_fkey" FOREIGN KEY ("logistics_partner_id") REFERENCES "logistics_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_delivery_pricing" ADD CONSTRAINT "city_delivery_pricing_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_delivery_pricing" ADD CONSTRAINT "city_delivery_pricing_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_partners" ADD CONSTRAINT "logistics_partners_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_rules" ADD CONSTRAINT "delivery_rules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_holidays" ADD CONSTRAINT "delivery_holidays_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

