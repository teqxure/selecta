import "server-only";
import { headers } from "next/headers";

/** IP/user-agent for login history and audit logs — best-effort, proxies may omit either. */
export async function getRequestMeta() {
  const headerList = await headers();
  const ipAddress = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || undefined;
  const userAgent = headerList.get("user-agent") ?? undefined;
  return { ipAddress, userAgent };
}
