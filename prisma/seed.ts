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

async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

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
