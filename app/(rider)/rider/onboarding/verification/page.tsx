import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { RIDER_VEHICLE_TYPES_REQUIRING_LICENSE } from "@/lib/validators/onboarding";
import { ROUTES } from "@/lib/constants/routes";
import { RiderOnboardingVerificationForm } from "./form";

export default async function RiderOnboardingVerificationPage() {
  const session = await requireAuth();
  const profile = await getRiderProfileByUserId(session.userId);

  if (profile.onboardingStep < 3) redirect(ROUTES.rider.onboarding.vehicle);

  const requiresLicense = RIDER_VEHICLE_TYPES_REQUIRING_LICENSE.has(profile.vehicleType as never);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Verify your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">A few documents so our team can confirm it&apos;s really you.</p>
      </div>
      <RiderOnboardingVerificationForm requiresLicense={requiresLicense} />
    </div>
  );
}
