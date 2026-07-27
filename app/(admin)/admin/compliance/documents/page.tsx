import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { listDocumentReviewQueue } from "@/services/compliance/document.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileCheck } from "lucide-react";
import { approveSellerDocumentAction, rejectSellerDocumentAction } from "./actions";

interface AdminDocumentsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export default async function AdminDocumentsPage({ searchParams }: AdminDocumentsPageProps) {
  await requirePermission("VERIFY_DOCUMENTS");
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as (typeof STATUSES)[number]) ? (status as (typeof STATUSES)[number]) : "PENDING";

  const documents = await listDocumentReviewQueue(filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Documents" }]}
        title="Document review queue"
        description="Review sellers' compliance document submissions."
      />

      <Card>
        <CardContent className="flex flex-wrap gap-1.5 p-4 text-xs">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`${ROUTES.admin.complianceDocuments}?status=${s}`}
              className={`rounded-full px-2.5 py-1 ${filter === s ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {documents.length === 0 && <EmptyState icon={FileCheck} title="Nothing here" description={`No ${filter.toLowerCase()} documents.`} />}
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{doc.documentType.name}</span>
                    <Badge tone={doc.status === "APPROVED" ? "success" : doc.status === "REJECTED" ? "danger" : "neutral"}>{doc.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {doc.sellerProfile.storeName ?? doc.sellerProfile.businessName} · {doc.sellerProfile.user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {doc.submittedAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline">
                    View file
                  </Button>
                </a>
              </div>

              {doc.status === "PENDING" && (
                <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                  <form action={approveSellerDocumentAction} className="flex items-end gap-2">
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input
                      name="notes"
                      placeholder="Notes (optional)"
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectSellerDocumentAction} className="flex items-end gap-2">
                    <input type="hidden" name="documentId" value={doc.id} />
                    <input
                      name="reason"
                      placeholder="Rejection reason"
                      required
                      className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Reject
                    </Button>
                  </form>
                </div>
              )}
              {doc.status === "REJECTED" && doc.rejectionReason && (
                <p className="text-xs text-red-600">Reason: {doc.rejectionReason}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
