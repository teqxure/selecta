import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { releaseEligibleEscrowTransactions } from "@/services/platform/finance.service";

export const runtime = "nodejs";

/**
 * Weekly sweep (see vercel.json) — releases escrowed transactions past the
 * configured hold + cooling period, but only when Selecta HQ has turned on
 * "Auto weekly settlement" in System Settings. Fails closed: with no
 * CRON_SECRET configured, every request is rejected rather than silently
 * allowed.
 */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron sweep is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await releaseEligibleEscrowTransactions();
  return NextResponse.json(result);
}
