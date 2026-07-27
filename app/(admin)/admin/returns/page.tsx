import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { listReturnQueue } from "@/services/returns/return.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Undo2 } from "lucide-react";
import type { ReturnStatus } from "@/generated/prisma/enums";

const STATUSES: ReturnStatus[] = ["REQUESTED", "APPROVED", "ITEM_RECEIVED", "COMPLETED", "REJECTED"];

const STATUS_TONE: Record<string, "warning" | "success" | "danger" | "neutral"> = {
  REQUESTED: "warning",
  APPROVED: "neutral",
  ITEM_RECEIVED: "neutral",
  COMPLETED: "success",
  REJECTED: "danger",
};

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("APPROVE_REFUNDS");
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as ReturnStatus) ? (status as ReturnStatus) : undefined;

  const returns = await listReturnQueue(filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Returns" }]}
        title="Returns"
        description="Item-level, buyer-initiated returns — distinct from disputes."
      />

      <Card>
        <CardContent className="flex flex-wrap gap-1.5 p-4 text-xs">
          <Link
            href={ROUTES.admin.returns}
            className={`rounded-full px-2.5 py-1 ${!filter ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`${ROUTES.admin.returns}?status=${s}`}
              className={`rounded-full px-2.5 py-1 ${filter === s ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s.replaceAll("_", " ")}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {returns.length === 0 && <EmptyState icon={Undo2} title="Nothing here" description="No returns match this filter." />}
        {returns.map((request) => (
          <Link key={request.id} href={ROUTES.admin.return(request.id)}>
            <Card className="transition-colors hover:border-accent/40">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{request.orderItem.product.title}</span>
                    <Badge tone={STATUS_TONE[request.status]}>{request.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {request.buyer.firstName} {request.buyer.lastName} · {request.seller.storeName ?? request.seller.businessName}
                  </p>
                  <p className="text-xs text-muted-foreground">{request.reason}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {request.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
