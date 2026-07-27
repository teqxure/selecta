import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getReturnById } from "@/services/returns/return.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { approveReturnAction, rejectReturnAction, markReturnItemReceivedAction } from "../actions";
import { ResolveReturnForm } from "./resolve-form";

export default async function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("APPROVE_REFUNDS");
  const { id } = await params;
  const request = await getReturnById(id);
  if (!request) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Returns", href: ROUTES.admin.returns }, { label: request.orderItem.product.title }]}
        title={request.orderItem.product.title}
        description={`Filed by ${request.buyer.firstName} ${request.buyer.lastName}`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Details</CardTitle>
            <Badge tone="neutral">{request.status.replaceAll("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{request.reason}</p>
          <p className="text-muted-foreground">
            Item price: {Number(request.orderItem.unitPrice)} · Qty {request.orderItem.quantity}
          </p>
          <p className="text-muted-foreground">Seller: {request.seller.storeName ?? request.seller.businessName}</p>
          {request.evidenceUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {request.evidenceUrls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                  Evidence
                </a>
              ))}
            </div>
          )}
          {request.resolutionNotes && <p className="text-muted-foreground">Notes: {request.resolutionNotes}</p>}
        </CardContent>
      </Card>

      {request.status === "REQUESTED" && (
        <Card>
          <CardHeader>
            <CardTitle>Review request</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <form action={approveReturnAction}>
              <input type="hidden" name="returnId" value={request.id} />
              <Button type="submit" variant="secondary" size="sm">
                Approve — buyer sends item back
              </Button>
            </form>
            <form action={rejectReturnAction} className="flex items-end gap-2">
              <input type="hidden" name="returnId" value={request.id} />
              <Input name="reason" placeholder="Rejection reason" required />
              <Button type="submit" variant="outline" size="sm">
                Reject
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {request.status === "APPROVED" && (
        <Card>
          <CardHeader>
            <CardTitle>Item in transit</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={markReturnItemReceivedAction}>
              <input type="hidden" name="returnId" value={request.id} />
              <Button type="submit" variant="secondary" size="sm">
                Mark item received
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(request.status === "APPROVED" || request.status === "ITEM_RECEIVED") && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve</CardTitle>
          </CardHeader>
          <CardContent>
            <ResolveReturnForm returnId={request.id} maxAmount={Number(request.orderItem.unitPrice) * request.orderItem.quantity} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
