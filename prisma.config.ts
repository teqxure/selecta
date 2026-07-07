import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Seed script run after `prisma migrate reset`/`prisma db seed`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Unpooled connection: Migrate needs a direct connection, not PgBouncer.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
