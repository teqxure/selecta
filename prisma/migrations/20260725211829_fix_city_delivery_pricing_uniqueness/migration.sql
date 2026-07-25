-- DropIndex
DROP INDEX "city_delivery_pricing_city_idx";

-- DropIndex
DROP INDEX "city_delivery_pricing_city_zone_id_key";

-- CreateIndex
CREATE INDEX "city_delivery_pricing_city_zone_id_idx" ON "city_delivery_pricing"("city", "zone_id");

