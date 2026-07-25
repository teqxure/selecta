import "server-only";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";

const DELIVERY_RULE_SINGLETON_ID = "singleton";

// ---------------------------------------------------------------------------
// Delivery zones
// ---------------------------------------------------------------------------

export function listDeliveryZones() {
  return db.deliveryZone.findMany({ orderBy: { minKm: "asc" } });
}

export interface DeliveryZoneInput {
  label: string;
  minKm: number;
  maxKm?: number | null;
  sortOrder?: number;
}

export async function createDeliveryZone(adminId: string, input: DeliveryZoneInput) {
  if (input.minKm < 0) throw new ValidationError("Minimum distance can't be negative");
  if (input.maxKm != null && input.maxKm <= input.minKm) {
    throw new ValidationError("Maximum distance must be greater than the minimum");
  }

  return db.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.create({
      data: { ...input, maxKm: input.maxKm ?? null, updatedById: adminId },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_ZONE_CREATED", entityType: "DeliveryZone", entityId: zone.id, metadata: input as object },
    });
    return zone;
  });
}

export async function updateDeliveryZone(adminId: string, id: string, input: DeliveryZoneInput) {
  if (input.minKm < 0) throw new ValidationError("Minimum distance can't be negative");
  if (input.maxKm != null && input.maxKm <= input.minKm) {
    throw new ValidationError("Maximum distance must be greater than the minimum");
  }

  return db.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.update({
      where: { id },
      data: { ...input, maxKm: input.maxKm ?? null, updatedById: adminId },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_ZONE_UPDATED", entityType: "DeliveryZone", entityId: id, metadata: input as object },
    });
    return zone;
  });
}

export async function setDeliveryZoneActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const zone = await tx.deliveryZone.update({ where: { id }, data: { isActive, updatedById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "DELIVERY_ZONE_ACTIVATED" : "DELIVERY_ZONE_DEACTIVATED", entityType: "DeliveryZone", entityId: id },
    });
    return zone;
  });
}

// ---------------------------------------------------------------------------
// City delivery pricing
// ---------------------------------------------------------------------------

export function listCityDeliveryPricing() {
  return db.cityDeliveryPricing.findMany({
    include: { zone: true },
    orderBy: [{ city: "asc" }, { zone: { minKm: "asc" } }],
  });
}

export interface CityDeliveryPricingInput {
  city?: string | null;
  zoneId: string;
  price: number;
  currency?: string;
}

export async function upsertCityDeliveryPricing(adminId: string, input: CityDeliveryPricingInput) {
  if (input.price < 0) throw new ValidationError("Price can't be negative");
  const city = input.city?.trim() || null;

  return db.$transaction(async (tx) => {
    // One row per (city, zone) is enforced here, not by a DB constraint —
    // see the doc comment on CityDeliveryPricing for why a compound unique
    // can't do this when `city` is nullable.
    const existing = await tx.cityDeliveryPricing.findFirst({
      where: city ? { zoneId: input.zoneId, city: { equals: city, mode: "insensitive" } } : { zoneId: input.zoneId, city: null },
    });
    const pricing = existing
      ? await tx.cityDeliveryPricing.update({
          where: { id: existing.id },
          data: { price: input.price, currency: input.currency ?? "NGN", isActive: true, updatedById: adminId },
        })
      : await tx.cityDeliveryPricing.create({
          data: { city, zoneId: input.zoneId, price: input.price, currency: input.currency ?? "NGN", updatedById: adminId },
        });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "CITY_DELIVERY_PRICING_UPSERTED",
        entityType: "CityDeliveryPricing",
        entityId: pricing.id,
        metadata: input as object,
      },
    });
    return pricing;
  });
}

export async function setCityDeliveryPricingActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const pricing = await tx.cityDeliveryPricing.update({ where: { id }, data: { isActive, updatedById: adminId } });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: isActive ? "CITY_DELIVERY_PRICING_ACTIVATED" : "CITY_DELIVERY_PRICING_DEACTIVATED",
        entityType: "CityDeliveryPricing",
        entityId: id,
      },
    });
    return pricing;
  });
}

// ---------------------------------------------------------------------------
// Logistics partners
// ---------------------------------------------------------------------------

export function listLogisticsPartners() {
  return db.logisticsPartner.findMany({ orderBy: { name: "asc" } });
}

export interface LogisticsPartnerInput {
  name: string;
  logoUrl?: string | null;
  coverageCities?: string[];
  pricingModel?: string | null;
  estimatedMinutes?: number | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}

export async function createLogisticsPartner(adminId: string, input: LogisticsPartnerInput) {
  return db.$transaction(async (tx) => {
    const partner = await tx.logisticsPartner.create({ data: { ...input, updatedById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "LOGISTICS_PARTNER_CREATED", entityType: "LogisticsPartner", entityId: partner.id, metadata: input as object },
    });
    return partner;
  });
}

export async function updateLogisticsPartner(adminId: string, id: string, input: LogisticsPartnerInput) {
  return db.$transaction(async (tx) => {
    const partner = await tx.logisticsPartner.update({ where: { id }, data: { ...input, updatedById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "LOGISTICS_PARTNER_UPDATED", entityType: "LogisticsPartner", entityId: id, metadata: input as object },
    });
    return partner;
  });
}

export async function setLogisticsPartnerActive(adminId: string, id: string, isActive: boolean) {
  return db.$transaction(async (tx) => {
    const partner = await tx.logisticsPartner.update({ where: { id }, data: { isActive, updatedById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: isActive ? "LOGISTICS_PARTNER_ACTIVATED" : "LOGISTICS_PARTNER_DEACTIVATED", entityType: "LogisticsPartner", entityId: id },
    });
    return partner;
  });
}

// ---------------------------------------------------------------------------
// Delivery rule (singleton) + holidays
// ---------------------------------------------------------------------------

export function getDeliveryRuleForAdmin() {
  return db.deliveryRule.upsert({
    where: { id: DELIVERY_RULE_SINGLETON_ID },
    update: {},
    create: { id: DELIVERY_RULE_SINGLETON_ID },
  });
}

export interface DeliveryRuleInput {
  pickupRadiusKm?: number;
  sameDayRadiusKm?: number;
  sameDayCutoffHour?: number;
  maxDeliveryDistanceKm?: number;
  expressAvailable?: boolean;
  expressSurcharge?: number;
  emergencyDisableAll?: boolean;
  emergencyDisableReason?: string | null;
}

export async function updateDeliveryRule(adminId: string, input: DeliveryRuleInput) {
  return db.$transaction(async (tx) => {
    const rule = await tx.deliveryRule.upsert({
      where: { id: DELIVERY_RULE_SINGLETON_ID },
      update: { ...input, updatedById: adminId },
      create: { id: DELIVERY_RULE_SINGLETON_ID, ...input, updatedById: adminId },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_RULE_UPDATED", entityType: "DeliveryRule", entityId: DELIVERY_RULE_SINGLETON_ID, metadata: input as object },
    });
    return rule;
  });
}

export function listDeliveryHolidays() {
  return db.deliveryHoliday.findMany({ orderBy: { date: "asc" } });
}

export interface DeliveryHolidayInput {
  date: Date;
  label: string;
  disablesSameDay?: boolean;
  disablesAll?: boolean;
}

export async function createDeliveryHoliday(adminId: string, input: DeliveryHolidayInput) {
  return db.$transaction(async (tx) => {
    const holiday = await tx.deliveryHoliday.create({ data: { ...input, createdById: adminId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_HOLIDAY_CREATED", entityType: "DeliveryHoliday", entityId: holiday.id, metadata: input as object },
    });
    return holiday;
  });
}

export async function deleteDeliveryHoliday(adminId: string, id: string) {
  return db.$transaction(async (tx) => {
    await tx.deliveryHoliday.delete({ where: { id } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "DELIVERY_HOLIDAY_DELETED", entityType: "DeliveryHoliday", entityId: id },
    });
  });
}
