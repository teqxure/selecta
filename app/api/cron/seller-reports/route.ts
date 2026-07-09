import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runWeeklySellerReports, runMonthlySellerReports } from "@/services/insights/seller-insight.service";

export const runtime = "nodejs";

/**
 * Runs daily (see vercel.json) but only actually sends on the intended
 * cadence: weekly reports every Monday, monthly reports on the 1st — a
 * single daily heartbeat with an internal day check, rather than juggling
 * multiple cron schedules for the same route. Fails closed with no
 * CRON_SECRET configured, same as the monetization sweep.
 */
export async function GET(request: NextRequest) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron sweep is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const isFirstOfMonth = now.getUTCDate() === 1;

  const [weekly, monthly] = await Promise.all([
    isMonday ? runWeeklySellerReports() : Promise.resolve(null),
    isFirstOfMonth ? runMonthlySellerReports() : Promise.resolve(null),
  ]);

  return NextResponse.json({ weekly, monthly });
}
