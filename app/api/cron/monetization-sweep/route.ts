import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runSubscriptionExpirySweep } from "@/services/monetization/subscription.service";
import { runBoostExpirySweep } from "@/services/monetization/boost.service";

export const runtime = "nodejs";

/**
 * Daily sweep (see vercel.json) — expires past-due subscriptions, warns
 * sellers whose subscription expires in 2-3 days, and completes boost
 * campaigns past their end date (sending the performance report). Fails
 * closed: with no CRON_SECRET configured, every request is rejected rather
 * than silently allowed.
 */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron sweep is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscriptionResult, boostResult] = await Promise.all([runSubscriptionExpirySweep(), runBoostExpirySweep()]);

  return NextResponse.json({ subscription: subscriptionResult, boost: boostResult });
}
