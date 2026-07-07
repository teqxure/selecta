import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Seed preparation only — no fixture data yet. Add category trees, demo
 * sellers, and sample products here once the marketplace schema stabilizes.
 * Run with: npx prisma db seed
 */
async function main() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  console.log("Seed script ready — no seed data defined yet.");

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
