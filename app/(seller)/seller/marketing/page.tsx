import Link from "next/link";
import { Zap, Rocket, Wallet, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listProductsBySeller } from "@/services/products/product.service";
import { listCampaignsForSeller } from "@/services/monetization/boost.service";
import { getEffectiveLimits } from "@/services/monetization/subscription.service";
import { getSellerMonetizationSpend } from "@/services/finance/ledger.service";
import { getGrowthPartnerApplication } from "@/services/monetization/growth-partner.service";
import { getBoostRecommendationsForSeller } from "@/services/insights/product-insight.service";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { BOOST_GOAL_LABELS } from "@/lib/constants/monetization";
import { BoostForm } from "./boost-form";

const CAMPAIGN_STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING_PAYMENT: "warning",
  ACTIVE: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

const GROWTH_TIPS = [
  "List with at least 4 photos — listings with more photos get more views.",
  "Respond quickly to buyer messages — response time affects your store rating.",
  "Keep your prices competitive with similar listings in your category.",
  "Boost a new listing in its first week to give it an early visibility lift.",
  "Complete your store verification to unlock the verified-seller trust badge.",
];

export default async function SellerMarketingCenterPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const [activeProducts, campaigns, limits, spend, growthPartnerApplication, boostRecommendations] = await Promise.all([
    listProductsBySeller(profile.id, { status: "ACTIVE" }),
    listCampaignsForSeller(profile.id),
    getEffectiveLimits(profile.id),
    getSellerMonetizationSpend(profile.id),
    getGrowthPartnerApplication(profile.id),
    getBoostRecommendationsForSeller(profile.id, 3),
  ]);

  const runningCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Marketing Center</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Running campaigns" icon={Rocket} value={String(runningCampaigns)} />
        <StatCard label="Boost credits remaining" icon={Zap} value={String(limits.boostCreditsRemaining)} />
        <StatCard label="Total spent on boosts" icon={Wallet} value={format(spend.boostSpend)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Boost a product</CardTitle>
            <CardDescription>Pays with your subscription credits first, then card if you&apos;re out of credits.</CardDescription>
          </CardHeader>
          <CardContent>
            <BoostForm products={activeProducts.map((p) => ({ id: p.id, title: p.title }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-secondary-foreground">
              You&apos;re on <strong>Selecta {limits.planName}</strong>.
            </p>
            <Link href={ROUTES.seller.growth}>
              <Button variant="outline" size="sm">
                Manage subscription
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {boostRecommendations.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle>Worth boosting</CardTitle>
            <CardDescription>Based on real sales and save activity — not a random suggestion.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {boostRecommendations.map((rec) => (
              <div key={rec.productId} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-secondary-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No boost campaigns yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`${ROUTES.seller.marketing}/campaigns/${campaign.id}`}>
                <Card hoverable>
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-secondary-foreground">{campaign.product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {BOOST_GOAL_LABELS[campaign.goal]} · {campaign.durationDays} days
                      </p>
                    </div>
                    <Badge tone={CAMPAIGN_STATUS_TONE[campaign.status]}>{campaign.status.replace("_", " ")}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} />
            Selecta Growth Partner
          </CardTitle>
          <CardDescription>Let Selecta help grow your store — a managed growth service, coming soon.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          {growthPartnerApplication ? (
            <Badge tone={growthPartnerApplication.status === "ACCEPTED" ? "success" : "neutral"}>
              Application: {growthPartnerApplication.status.toLowerCase()}
            </Badge>
          ) : (
            <p className="text-sm text-muted-foreground">Not applied yet.</p>
          )}
          <Link href={ROUTES.seller.growthPartner}>
            <Button variant="outline" size="sm">
              {growthPartnerApplication ? "View application" : "Apply"}
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Growth tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm text-secondary-foreground">
            {GROWTH_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="text-accent">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
