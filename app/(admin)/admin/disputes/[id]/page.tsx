import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getDisputeForAdmin } from "@/services/disputes/dispute.service";
import { isAppError } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { markUnderReviewAction, resolveWithRefundAction, resolveWithReleaseAction, closeWithoutActionAction } from "./actions";
import { ResolveForm } from "./resolve-form";

export default async function AdminDisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("disputes.handle");
  const { id } = await params;

  let dispute;
  try {
    dispute = await getDisputeForAdmin(id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const format = (value: number, currency: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(value);
  const isOpenOrReview = dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW";
  const sellerTransaction = dispute.order.transactions.find((t) => t.sellerId === dispute.sellerId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {dispute.type.replaceAll("_", " ")} — Order #{dispute.orderId.slice(-8)}
          </h1>
        </div>
        <Badge tone={STATUS_TONE[dispute.status] ?? "neutral"}>{dispute.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parties</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-medium text-foreground">Buyer:</span> {dispute.buyer.firstName} {dispute.buyer.lastName} ·{" "}
            {dispute.buyer.email}
          </p>
          <p>
            <span className="font-medium text-foreground">Seller:</span>{" "}
            {dispute.seller.storeName ?? dispute.seller.businessName} · {dispute.seller.user.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="text-foreground">{dispute.description}</p>
          {dispute.evidenceUrls.length > 0 && (
            <ul className="list-disc pl-5 text-accent underline">
              {dispute.evidenceUrls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment &amp; escrow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {dispute.order.payment && (
            <p className="text-muted-foreground">
              {dispute.order.payment.provider} · {format(Number(dispute.order.payment.amount), dispute.order.payment.currency)} ·{" "}
              {dispute.order.payment.status}
            </p>
          )}
          {sellerTransaction ? (
            <p className="text-muted-foreground">
              Seller transaction: {format(Number(sellerTransaction.sellerAmount), sellerTransaction.currency)} —{" "}
              <Badge tone={STATUS_TONE[sellerTransaction.status] ?? "neutral"}>{sellerTransaction.status.replaceAll("_", " ")}</Badge>
            </p>
          ) : (
            <p className="text-muted-foreground">No transaction found for this seller on this order.</p>
          )}
        </CardContent>
      </Card>

      {isOpenOrReview && (
        <Card>
          <CardHeader>
            <CardTitle>Resolve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {dispute.status === "OPEN" && (
              <form action={markUnderReviewAction}>
                <input type="hidden" name="disputeId" value={dispute.id} />
                <Button type="submit" size="sm" variant="secondary">
                  Mark under review
                </Button>
              </form>
            )}

            <ResolveForm
              disputeId={dispute.id}
              action={resolveWithRefundAction}
              label="Refund buyer"
              variant="outline"
              placeholder="Resolution note (sides with buyer — seller's escrow is refunded)"
            />
            <ResolveForm
              disputeId={dispute.id}
              action={resolveWithReleaseAction}
              label="Release to seller"
              variant="accent"
              placeholder="Resolution note (sides with seller — escrow releases as normal)"
            />
            <ResolveForm
              disputeId={dispute.id}
              action={closeWithoutActionAction}
              label="Close (no action)"
              variant="ghost"
              placeholder="Reason for closing without a financial action"
            />
          </CardContent>
        </Card>
      )}

      {dispute.resolution && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {dispute.resolution}
            {dispute.resolvedBy && (
              <p className="mt-1 text-xs">
                by {dispute.resolvedBy.firstName} {dispute.resolvedBy.lastName}
                {dispute.resolvedAt && ` · ${dispute.resolvedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
