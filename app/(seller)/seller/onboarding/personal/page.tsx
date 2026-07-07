import { currentUser } from "@/lib/auth/current-user";
import { OnboardingPersonalForm } from "./form";

export default async function OnboardingPersonalPage() {
  const user = await currentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Let&apos;s confirm your details</h1>
        <p className="mt-1 text-sm text-muted-foreground">This is what buyers and Selecta support will see.</p>
      </div>
      <OnboardingPersonalForm
        defaultFirstName={user?.firstName ?? ""}
        defaultLastName={user?.lastName ?? ""}
        defaultPhone={user?.phone ?? ""}
      />
    </div>
  );
}
