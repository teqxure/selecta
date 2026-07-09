import Link from "next/link";
import { AlertTriangle, Flag, ShieldAlert, Gavel } from "lucide-react";
import { requirePermission } from "@/lib/auth/rbac";
import { getUsersFlaggedForReview } from "@/services/messaging/contact-safety.service";
import { listReportedConversations, listHighDisputeSellers } from "@/services/messaging/trust-moderation.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { warnUserAction, restrictMessagingAction, suspendUserAction } from "./actions";

export default async function AdminTrustDashboardPage() {
  await requirePermission("support.messages");

  const [flaggedUsers, reportedConversations, highDisputeSellers] = await Promise.all([
    getUsersFlaggedForReview(),
    listReportedConversations(),
    listHighDisputeSellers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Trust & Safety" }]}
        title="Trust & Safety"
        description="Flagged conversations, repeated contact-sharing attempts, and unusually high dispute sellers."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users flagged for review" icon={ShieldAlert} value={String(flaggedUsers.length)} />
        <StatCard label="Reported conversations" icon={Flag} value={String(reportedConversations.length)} />
        <StatCard label="High-dispute sellers" icon={Gavel} value={String(highDisputeSellers.length)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" strokeWidth={2} />
            Repeated contact-sharing attempts
          </CardTitle>
          <CardDescription>3+ contact-safety flags in the last 90 days.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {flaggedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users flagged right now.</p>
          ) : (
            flaggedUsers.map((user) => (
              <div key={user.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-secondary-foreground">
                    {user.firstName} {user.lastName} <span className="text-muted-foreground">({user.email})</span>
                  </p>
                  <Badge tone="warning">{user.violationCount} flags</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <form action={warnUserAction}>
                    <input type="hidden" name="userId" value={user.userId} />
                    <Button type="submit" size="sm" variant="ghost">
                      Warn
                    </Button>
                  </form>
                  <form action={restrictMessagingAction}>
                    <input type="hidden" name="userId" value={user.userId} />
                    <Button type="submit" size="sm" variant="outline">
                      Restrict messaging
                    </Button>
                  </form>
                  <form action={suspendUserAction}>
                    <input type="hidden" name="userId" value={user.userId} />
                    <Button type="submit" size="sm" variant="ghost" className="text-red-600">
                      Suspend
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-red-600" strokeWidth={2} />
            Reported conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {reportedConversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reported conversations.</p>
          ) : (
            reportedConversations.map((conversation) => (
              <Link key={conversation.id} href={ROUTES.admin.conversation(conversation.id)}>
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm hover:border-accent/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-secondary-foreground">
                      {conversation.buyer.firstName} {conversation.buyer.lastName} ↔{" "}
                      {conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{conversation.reportReason}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {conversation.reportedAt?.toLocaleDateString("en-NG")}
                  </span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-4 w-4 text-red-600" strokeWidth={2} />
            High-dispute sellers
          </CardTitle>
          <CardDescription>Dispute rate relative to transaction volume, not a raw count.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {highDisputeSellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sellers stand out right now.</p>
          ) : (
            highDisputeSellers.map((seller) => (
              <div key={seller.sellerId} className="flex items-center justify-between text-sm">
                <span className="text-secondary-foreground">{seller.storeName}</span>
                <span className="text-xs text-muted-foreground">
                  {seller.disputeCount} disputes / {seller.transactionCount} transactions ({(seller.disputeRatio * 100).toFixed(0)}%)
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
