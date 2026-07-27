import { headers } from "next/headers";
import { isGoogleAuthConfigured } from "@/lib/auth/google";
import { env } from "@/lib/env";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const host = (await headers()).get("host") ?? "";
  const isRiderHost = Boolean(env.NEXT_PUBLIC_RIDER_HOST) && (host === env.NEXT_PUBLIC_RIDER_HOST || host.startsWith(`${env.NEXT_PUBLIC_RIDER_HOST}:`));

  return <RegisterForm googleEnabled={isGoogleAuthConfigured()} defaultRole={isRiderHost ? "RIDER" : undefined} />;
}
