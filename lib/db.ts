import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Prisma 7 requires an explicit driver adapter — there is no more
 * `new PrismaClient()` with an implicit connection-string engine.
 * We use Neon's adapter so connections are HTTP/WebSocket-based and safe to
 * open per-invocation in serverless functions (no TCP pool exhaustion).
 */
function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });
}

declare global {
  var __prisma: ReturnType<typeof createPrismaClient> | undefined;
}

// Cache the client on `globalThis` in development so Next.js's hot-reload
// doesn't spin up a new connection pool on every file save.
export const db = globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
