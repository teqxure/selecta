import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { RiderHero } from "@/components/rider/RiderHero";
import { RiderValuePropGrid } from "@/components/rider/RiderValuePropGrid";
import { RiderHowItWorks } from "@/components/rider/RiderHowItWorks";
import { RiderFAQAccordion } from "@/components/rider/RiderFAQAccordion";
import { RiderCTABanner } from "@/components/rider/RiderCTABanner";

export const metadata = {
  title: "Become a Rider — Selecta",
  description: "Deliver for Selecta. Earn on your own schedule, get paid weekly, and start with any vehicle.",
};

export default async function BecomeARiderPage() {
  const user = await currentUser();
  if (user?.role === Role.RIDER) redirect(ROUTES.rider.dashboard);

  const [activeRiderCount, completedDeliveryCount] = await Promise.all([
    db.riderProfile.count({ where: { verificationStatus: "VERIFIED", isActive: true } }),
    db.delivery.count({ where: { status: { in: ["DELIVERED", "COMPLETED"] } } }),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href={ROUTES.login}>
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href={ROUTES.register}>
            <Button variant="accent" size="sm">
              Sign up
            </Button>
          </Link>
        </div>
      </div>

      <main className="flex-1">
        <RiderHero activeRiderCount={activeRiderCount} completedDeliveryCount={completedDeliveryCount} />

        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          <RiderValuePropGrid />
          <RiderHowItWorks />
          <RiderCTABanner />
          <RiderFAQAccordion />
        </div>
      </main>

      <Footer />
    </div>
  );
}
