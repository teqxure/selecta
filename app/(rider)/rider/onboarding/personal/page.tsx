import { currentUser } from "@/lib/auth/current-user";
import { RiderOnboardingPersonalForm } from "./form";

export default async function RiderOnboardingPersonalPage() {
  const user = await currentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Let&apos;s confirm your details</h1>
        <p className="mt-1 text-sm text-muted-foreground">This is what dispatch and buyers will see.</p>
      </div>
      <RiderOnboardingPersonalForm
        defaultFirstName={user?.firstName ?? ""}
        defaultLastName={user?.lastName ?? ""}
        defaultPhone={user?.phone ?? ""}
      />
    </div>
  );
}
