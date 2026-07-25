import "server-only";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import type { DeliveryFulfillmentType } from "@/generated/prisma/enums";

const DELIVERY_RULE_SINGLETON_ID = "singleton";
const EARTH_RADIUS_KM = 6371;

/**
 * No-coordinates rollout period only (existing sellers/buyers before this
 * feature shipped have none yet) — a rough city-string-equality guess so a
 * price can still be resolved, never a crash and never a pretend-precise
 * distance. Once both sides have real coordinates this path never runs.
 */
const FALLBACK_SAME_CITY_KM = 5;
const FALLBACK_DIFFERENT_CITY_KM = 25;

/** Dispatch rider average incl. stops/traffic — a stand-in for real routing until a maps/directions API is chosen. */
const AVG_URBAN_SPEED_KMH = 18;
/** Flat pickup/handoff time before travel starts. */
const DISPATCH_OVERHEAD_MINUTES = 15;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Pure function, no external dependency — great-circle straight-line distance. */
export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function estimateTravelMinutes(distanceKm: number): number {
  return Math.round(DISPATCH_OVERHEAD_MINUTES + (distanceKm / AVG_URBAN_SPEED_KMH) * 60);
}

const KM_PER_DEGREE_LAT = 111;

/**
 * A cheap SQL-level pre-filter (lat/lng between bounds) before precise
 * haversine ranking in app code — same bounded-candidate-window philosophy
 * `searchProducts` already uses, applied to geo instead of relevance score.
 */
export function boundingBox(center: Coordinates, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lngDelta = radiusKm / (KM_PER_DEGREE_LAT * Math.cos((center.latitude * Math.PI) / 180) || 1);
  return {
    minLat: center.latitude - latDelta,
    maxLat: center.latitude + latDelta,
    minLng: center.longitude - lngDelta,
    maxLng: center.longitude + lngDelta,
  };
}

function resolveDistanceKm(input: {
  sellerCoords: Coordinates | null;
  buyerCoords: Coordinates | null;
  sellerCity: string | null;
  buyerCity: string | null;
}): number {
  if (input.sellerCoords && input.buyerCoords) {
    return haversineDistanceKm(input.sellerCoords, input.buyerCoords);
  }
  const sameCity =
    !!input.sellerCity && !!input.buyerCity && input.sellerCity.toLowerCase() === input.buyerCity.toLowerCase();
  return sameCity ? FALLBACK_SAME_CITY_KM : FALLBACK_DIFFERENT_CITY_KM;
}

/** The single lookup every distance calculation goes through — bands are shared across every city, never hardcoded in application code. */
export async function resolveZoneForDistance(distanceKm: number) {
  const zones = await db.deliveryZone.findMany({ where: { isActive: true }, orderBy: { minKm: "asc" } });
  const zone = zones.find((z) => distanceKm >= z.minKm && (z.maxKm === null || distanceKm < z.maxKm));
  if (!zone) {
    throw new ValidationError(
      "No delivery zone is configured for this distance — configure zones at /admin/logistics/zones",
    );
  }
  return zone;
}

/** City match (case-insensitive) first, then the null-city platform-default row — never a hardcoded number. */
export async function getDeliveryPrice(city: string | null, zoneId: string) {
  const cityMatch = city
    ? await db.cityDeliveryPricing.findFirst({
        where: { zoneId, isActive: true, city: { equals: city, mode: "insensitive" } },
      })
    : null;
  const pricing = cityMatch ?? (await db.cityDeliveryPricing.findFirst({ where: { zoneId, isActive: true, city: null } }));

  if (!pricing) {
    throw new ValidationError(
      `No delivery price is configured for this zone${city ? ` in ${city}` : ""} — configure pricing at /admin/logistics/pricing`,
    );
  }
  return { price: Number(pricing.price), currency: pricing.currency };
}

/** Creates the row with defaults on first read — nothing to configure before launch, same pattern as SystemSettings. */
export function getDeliveryRule() {
  return db.deliveryRule.upsert({
    where: { id: DELIVERY_RULE_SINGLETON_ID },
    update: {},
    create: { id: DELIVERY_RULE_SINGLETON_ID },
  });
}

function todayAsUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function getTodayHoliday() {
  return db.deliveryHoliday.findUnique({ where: { date: todayAsUtcDate() } });
}

export interface DeliveryQuoteInput {
  sellerCoords: Coordinates | null;
  buyerCoords: Coordinates | null;
  sellerCity: string | null;
  buyerCity: string | null;
}

export interface DeliveryQuote {
  distanceKm: number;
  estimatedMinutes: number;
  zoneLabel: string;
  price: number;
  currency: string;
  pickupEligible: boolean;
  sameDayEligible: boolean;
  expressEligible: boolean;
  expressSurcharge: number;
  arrivalEstimate: Date;
}

/**
 * The single entry point every product page / cart / checkout calls (Part
 * Five: "every checkout should call the logistics engine"). Never invents a
 * price — a genuinely unconfigured zone/city throws rather than silently
 * charging ₦0 or a made-up number.
 */
export async function calculateDeliveryQuote(input: DeliveryQuoteInput): Promise<DeliveryQuote> {
  const rule = await getDeliveryRule();
  if (rule.emergencyDisableAll) {
    throw new ValidationError(rule.emergencyDisableReason ?? "Delivery is temporarily unavailable — please check back shortly");
  }

  const distanceKm = resolveDistanceKm(input);
  if (distanceKm > rule.maxDeliveryDistanceKm) {
    throw new ValidationError(
      `This seller is ${distanceKm.toFixed(1)}km away, beyond Selecta's ${rule.maxDeliveryDistanceKm}km delivery range`,
    );
  }

  const zone = await resolveZoneForDistance(distanceKm);
  const { price, currency } = await getDeliveryPrice(input.buyerCity, zone.id);
  const estimatedMinutes = estimateTravelMinutes(distanceKm);
  const holiday = await getTodayHoliday();

  const now = new Date();
  const pickupEligible = distanceKm <= rule.pickupRadiusKm;
  const sameDayEligible =
    distanceKm <= rule.sameDayRadiusKm &&
    now.getHours() < rule.sameDayCutoffHour &&
    !holiday?.disablesSameDay &&
    !holiday?.disablesAll;
  const expressEligible = rule.expressAvailable && !holiday?.disablesAll;

  return {
    distanceKm,
    estimatedMinutes,
    zoneLabel: zone.label,
    price,
    currency,
    pickupEligible,
    sameDayEligible,
    expressEligible,
    expressSurcharge: Number(rule.expressSurcharge),
    arrivalEstimate: new Date(now.getTime() + estimatedMinutes * 60_000),
  };
}

/** Address coordinates take priority (most specific to this delivery); ambient user location is the fallback. Null when neither exists yet. */
export function resolveBuyerCoordinates(
  address: { latitude: number | null; longitude: number | null } | null | undefined,
  user: { latitude: number | null; longitude: number | null } | null | undefined,
): Coordinates | null {
  if (address?.latitude != null && address?.longitude != null) {
    return { latitude: address.latitude, longitude: address.longitude };
  }
  if (user?.latitude != null && user?.longitude != null) {
    return { latitude: user.latitude, longitude: user.longitude };
  }
  return null;
}

/** Final price for a chosen fulfillment type — pickup is free, express adds the configured surcharge. */
export function resolveFulfillmentPrice(quote: DeliveryQuote, fulfillmentType: DeliveryFulfillmentType): number {
  if (fulfillmentType === "PICKUP") return 0;
  if (fulfillmentType === "EXPRESS") return quote.price + quote.expressSurcharge;
  return quote.price;
}
