import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/rbac";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { ROLE_HOME_ROUTE, Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { Stepper } from "@/components/ui/Stepper";

const STEP_LABELS = ["Personal info", "Store setup", "Verification"];

export default async function SellerOnboardingLayout({ children }: { children: ReactNode }) {
  const session = await requireAuth();
  if (session.role !== Role.SELLER) redirect(ROLE_HOME_ROUTE[session.role]);

  const profile = await getSellerProfileByUserId(session.userId);
  if (profile.onboardingCompletedAt) redirect(ROUTES.seller.dashboard);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 py-4">
      <Stepper steps={STEP_LABELS} currentStep={Math.min(profile.onboardingStep, STEP_LABELS.length)} />
      {children}
    </div>
  );
}
