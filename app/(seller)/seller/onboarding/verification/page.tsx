import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROUTES } from "@/lib/constants/routes";
import { OnboardingVerificationForm } from "./form";

export default async function OnboardingVerificationPage() {
  const session = await requireAuth();
  const profile = await getSellerProfileByUserId(session.userId);

  if (profile.onboardingStep < 3) redirect(ROUTES.seller.onboarding.store);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Verify your store</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few photos so our team can confirm your store is real. Reviewed within 48 hours.
        </p>
      </div>
      <OnboardingVerificationForm />
    </div>
  );
}
