import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getGrowthPartnerApplication } from "@/services/monetization/growth-partner.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GrowthPartnerForm } from "./growth-partner-form";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  REVIEWING: "neutral",
  ACCEPTED: "success",
  REJECTED: "danger",
};

export default async function GrowthPartnerPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const application = await getGrowthPartnerApplication(profile.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" strokeWidth={2} />
        <h1 className="font-display text-2xl font-semibold text-foreground">Selecta Growth Partner</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Let Selecta help grow your store</CardTitle>
          <CardDescription>
            A future managed growth service — a dedicated Selecta team helping with listing strategy, campaigns, and
            store performance. Applications are open now; the full program is coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {application ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-secondary-foreground">Your application:</span>
                <Badge tone={STATUS_TONE[application.status]}>{application.status.toLowerCase()}</Badge>
              </div>
              {application.message && <p className="text-sm text-muted-foreground">&quot;{application.message}&quot;</p>}
              <p className="text-xs text-muted-foreground">
                Submitted {application.createdAt.toLocaleDateString("en-NG")}
              </p>
            </div>
          ) : (
            <GrowthPartnerForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
