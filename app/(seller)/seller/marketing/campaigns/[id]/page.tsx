import { notFound } from "next/navigation";
import { Eye, Heart, MessageCircle, ShoppingBag, Percent } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { db } from "@/lib/db";
import { getCampaignPerformance } from "@/services/monetization/boost.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants/routes";
import { BOOST_GOAL_LABELS } from "@/lib/constants/monetization";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING_PAYMENT: "warning",
  ACTIVE: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export default async function BoostCampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const { id } = await params;

  const campaign = await db.boostCampaign.findFirst({
    where: { id, sellerId: profile.id },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  if (!campaign) notFound();

  const performance = await getCampaignPerformance(campaign.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Marketing Center", href: ROUTES.seller.marketing }, { label: campaign.product.title }]}
        title={campaign.product.title}
        description={`${BOOST_GOAL_LABELS[campaign.goal]} · ${campaign.durationDays} days`}
      />

      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[campaign.status]}>{campaign.status.replace("_", " ")}</Badge>
        {campaign.startDate && (
          <span className="text-sm text-muted-foreground">
            {campaign.startDate.toLocaleDateString("en-NG")}
            {campaign.endDate ? ` – ${campaign.endDate.toLocaleDateString("en-NG")}` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Impressions" icon={Eye} value={performance.impressions.toLocaleString()} />
        <StatCard label="Views" icon={Eye} value={performance.views.toLocaleString()} />
        <StatCard label="Saves" icon={Heart} value={performance.saves.toLocaleString()} />
        <StatCard label="Messages" icon={MessageCircle} value={performance.messages.toLocaleString()} />
        <StatCard label="Orders" icon={ShoppingBag} value={performance.orders.toLocaleString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-accent" strokeWidth={2} />
            Conversion rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-display text-3xl font-semibold text-foreground">{(performance.conversionRate * 100).toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">Orders as a share of views during this campaign.</p>
        </CardContent>
      </Card>
    </div>
  );
}
