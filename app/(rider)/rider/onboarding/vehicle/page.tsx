import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { RiderOnboardingVehicleForm } from "./form";

export default async function RiderOnboardingVehiclePage() {
  const session = await requireAuth();
  const profile = await getRiderProfileByUserId(session.userId);

  if (profile.onboardingStep < 2) redirect(ROUTES.rider.onboarding.personal);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tell us about your vehicle</h1>
        <p className="mt-1 text-sm text-muted-foreground">This determines which documents you&apos;ll need to verify.</p>
      </div>
      <RiderOnboardingVehicleForm defaultVehicleType={profile.vehicleType ?? ""} defaultVehiclePlateNumber={profile.vehiclePlateNumber ?? ""} />
    </div>
  );
}
