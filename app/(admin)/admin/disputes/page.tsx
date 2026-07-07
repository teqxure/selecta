import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listDisputes } from "@/services/disputes/dispute.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Gavel } from "lucide-react";

export default async function AdminDisputesPage() {
  await requireRole(Role.ADMIN, Role.SUPER_ADMIN);
  const disputes = await listDisputes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Disputes</h1>
      </div>

      {disputes.length === 0 ? (
        <EmptyState icon={Gavel} title="No open disputes" description="Buyer-reported problems will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {disputes.map((dispute) => (
            <Link key={dispute.id} href={ROUTES.admin.dispute(dispute.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-secondary-foreground">
                      {dispute.type.replaceAll("_", " ")} · Order #{dispute.orderId.slice(-8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.buyer.firstName} {dispute.buyer.lastName} vs.{" "}
                      {dispute.seller.storeName ?? dispute.seller.businessName}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[dispute.status] ?? "neutral"}>{dispute.status.replaceAll("_", " ")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
