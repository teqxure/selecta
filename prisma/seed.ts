import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Idempotent (upsert by slug) — safe to re-run. Seeds the marketplace's
 * starter category tree so sellers have somewhere to list into on day one;
 * admins extend it from /admin/categories from here on.
 * Run with: npx prisma db seed
 */
const CATEGORY_TREE: { name: string; slug: string; children?: { name: string; slug: string }[] }[] = [
  {
    name: "Women",
    slug: "women",
    children: [
      { name: "Dresses", slug: "women-dresses" },
      { name: "Tops", slug: "women-tops" },
      { name: "Jeans", slug: "women-jeans" },
      { name: "Corporate wear", slug: "women-corporate-wear" },
    ],
  },
  {
    name: "Men",
    slug: "men",
    children: [
      { name: "Shirts", slug: "men-shirts" },
      { name: "Trousers", slug: "men-trousers" },
      { name: "Native wear", slug: "men-native-wear" },
    ],
  },
  { name: "Children", slug: "children" },
  {
    name: "Shoes",
    slug: "shoes",
    children: [
      { name: "Sneakers", slug: "shoes-sneakers" },
      { name: "Heels", slug: "shoes-heels" },
      { name: "Corporate shoes", slug: "shoes-corporate" },
    ],
  },
  { name: "Bags", slug: "bags" },
  { name: "Accessories", slug: "accessories" },
];

/**
 * Starter zone bands + platform-default pricing (Phase 4.5 spec's own
 * example numbers) plus the handful of per-city Zone A overrides the spec
 * calls out explicitly. Everything here is editable from
 * /admin/logistics afterward — this just gives delivery pricing something
 * to resolve on day one instead of throwing "not configured" on every quote.
 */
const DELIVERY_ZONES: { label: string; minKm: number; maxKm: number | null; sortOrder: number; defaultPrice: number }[] = [
  { label: "Zone A", minKm: 0, maxKm: 2, sortOrder: 1, defaultPrice: 500 },
  { label: "Zone B", minKm: 2, maxKm: 5, sortOrder: 2, defaultPrice: 800 },
  { label: "Zone C", minKm: 5, maxKm: 10, sortOrder: 3, defaultPrice: 1200 },
  { label: "Zone D", minKm: 10, maxKm: 20, sortOrder: 4, defaultPrice: 1800 },
  { label: "Zone E", minKm: 20, maxKm: null, sortOrder: 5, defaultPrice: 2500 },
];

/** Only the Zone A overrides the spec explicitly names — every other zone/city falls back to the platform default until an admin sets one. */
const CITY_ZONE_A_OVERRIDES: { city: string; price: number }[] = [
  { city: "Abuja", price: 500 },
  { city: "Lagos", price: 900 },
  { city: "Port Harcourt", price: 700 },
  { city: "Kano", price: 450 },
];

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const zoneIdByLabel = new Map<string, string>();
  for (const zone of DELIVERY_ZONES) {
    const row = await prisma.deliveryZone.upsert({
      where: { label: zone.label },
      create: { label: zone.label, minKm: zone.minKm, maxKm: zone.maxKm, sortOrder: zone.sortOrder },
      update: { minKm: zone.minKm, maxKm: zone.maxKm, sortOrder: zone.sortOrder },
    });
    zoneIdByLabel.set(zone.label, row.id);

    const existingDefault = await prisma.cityDeliveryPricing.findFirst({ where: { zoneId: row.id, city: null } });
    if (!existingDefault) {
      await prisma.cityDeliveryPricing.create({ data: { zoneId: row.id, city: null, price: zone.defaultPrice } });
    }
  }

  const zoneAId = zoneIdByLabel.get("Zone A")!;
  for (const override of CITY_ZONE_A_OVERRIDES) {
    const existing = await prisma.cityDeliveryPricing.findFirst({
      where: { zoneId: zoneAId, city: { equals: override.city, mode: "insensitive" } },
    });
    if (!existing) {
      await prisma.cityDeliveryPricing.create({ data: { zoneId: zoneAId, city: override.city, price: override.price } });
    }
  }

  console.log(`Seeded ${DELIVERY_ZONES.length} delivery zones with platform-default pricing and ${CITY_ZONE_A_OVERRIDES.length} city overrides.`);

  for (const mainCategory of CATEGORY_TREE) {
    const parent = await prisma.category.upsert({
      where: { slug: mainCategory.slug },
      create: { name: mainCategory.name, slug: mainCategory.slug },
      update: { name: mainCategory.name },
    });

    for (const child of mainCategory.children ?? []) {
      await prisma.category.upsert({
        where: { slug: child.slug },
        create: { name: child.name, slug: child.slug, parentId: parent.id },
        update: { name: child.name, parentId: parent.id },
      });
    }
  }

  console.log(`Seeded ${CATEGORY_TREE.length} main categories.`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
