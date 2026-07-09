import { Package, Zap, Calendar } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getEffectiveLimits, getLiveProductCount } from "@/services/monetization/subscription.service";
import { listActivePlans } from "@/services/monetization/subscription-plan.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PlanCard } from "./plan-card";
import { cancelSubscriptionAction } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";

export default async function SellerGrowthCenterPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const [limits, liveProductCount, plans] = await Promise.all([
    getEffectiveLimits(profile.id),
    getLiveProductCount(profile.id),
    listActivePlans(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Growth Center</h1>

      <Card className="border-accent/30 bg-accent/5">
        <CardHeader>
          <CardTitle>Selecta {limits.planName}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Products"
              icon={Package}
              value={limits.maxProducts === null ? `${liveProductCount}` : `${liveProductCount}/${limits.maxProducts}`}
            />
            <StatCard label="Boost credits remaining" icon={Zap} value={String(limits.boostCreditsRemaining)} />
            <StatCard
              label="Renews"
              icon={Calendar}
              value={limits.expiresAt ? limits.expiresAt.toLocaleDateString("en-NG") : "—"}
            />
          </div>
          {limits.isPaidPlan && (
            <form action={cancelSubscriptionAction} className="self-start">
              <SubmitButton variant="ghost" size="sm">
                Cancel subscription
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Plans</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plans are available yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={{ ...plan, monthlyPrice: Number(plan.monthlyPrice) }}
                isCurrent={plan.id === limits.planId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
