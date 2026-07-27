import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { currentUser } from "@/lib/auth/current-user";
import { getRiderProfileByUserId } from "@/services/logistics/rider.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { RiderSettingsForm } from "./settings-form";

export default async function RiderSettingsPage() {
  const session = await requireRole(Role.RIDER);
  const [user, profile] = await Promise.all([currentUser(), getRiderProfileByUserId(session.userId)]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your contact and vehicle details." />
      <RiderSettingsForm
        defaultFirstName={user?.firstName ?? ""}
        defaultLastName={user?.lastName ?? ""}
        defaultPhone={user?.phone ?? ""}
        defaultVehicleType={profile.vehicleType ?? ""}
        defaultVehiclePlateNumber={profile.vehiclePlateNumber ?? ""}
      />
    </div>
  );
}
