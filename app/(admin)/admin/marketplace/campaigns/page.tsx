import { requirePermission } from "@/lib/auth/rbac";
import { listCampaigns } from "@/services/marketing/campaign.service";
import { listCollections } from "@/services/marketing/collection.service";
import { listCoupons } from "@/services/marketing/coupon.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Megaphone } from "lucide-react";
import { setCampaignActiveAction } from "./actions";
import { CreateCampaignForm } from "./create-campaign-form";

export default async function AdminCampaignsPage() {
  await requirePermission("CREATE_PROMOTIONS");
  const [campaigns, collections, coupons] = await Promise.all([listCampaigns(), listCollections(), listCoupons()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Campaigns" }]}
        title="Marketing campaigns"
        description="A named initiative wrapping an optional collection and/or coupon with a date range."
      />

      <Card>
        <CardHeader>
          <CardTitle>All campaigns</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {campaigns.length === 0 && <EmptyState icon={Megaphone} title="No campaigns yet" description="Create one below." />}
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{campaign.name}</span>
                  <Badge tone={campaign.isActive ? "success" : "neutral"}>{campaign.isActive ? "Active" : "Inactive"}</Badge>
                  {campaign.collection && <Badge tone="neutral">{campaign.collection.name}</Badge>}
                  {campaign.coupon && <Badge tone="accent">{campaign.coupon.code}</Badge>}
                </div>
                {(campaign.startsAt || campaign.endsAt) && (
                  <p className="text-xs text-muted-foreground">
                    {campaign.startsAt ? new Date(campaign.startsAt).toLocaleDateString() : "—"} to{" "}
                    {campaign.endsAt ? new Date(campaign.endsAt).toLocaleDateString() : "—"}
                  </p>
                )}
              </div>
              <form action={setCampaignActiveAction}>
                <input type="hidden" name="id" value={campaign.id} />
                <input type="hidden" name="isActive" value={String(!campaign.isActive)} />
                <Button type="submit" size="sm" variant={campaign.isActive ? "outline" : "secondary"}>
                  {campaign.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateCampaignForm collections={collections} coupons={coupons} />
        </CardContent>
      </Card>
    </div>
  );
}
