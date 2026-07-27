import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { getSellerDocumentVault } from "@/services/compliance/document.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { submitSellerDocumentAction } from "./actions";

const REQUIREMENT_LABELS: Record<string, string> = {
  REQUIRED: "Required",
  OPTIONAL: "Optional",
  CONDITIONAL: "Conditional",
};

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
};

export default async function SellerCompliancePage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const vault = await getSellerDocumentVault(profile.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compliance documents"
        description="Upload the documents Selecta requires to keep your store in good standing. Re-upload any time — a new submission replaces the review status."
      />

      {vault.map(({ type, document }) => (
        <Card key={type.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{type.name}</CardTitle>
              <Badge tone="neutral">{REQUIREMENT_LABELS[type.requirement]}</Badge>
              {document && <Badge tone={STATUS_TONE[document.status]}>{document.status}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
            {type.conditionNote && <p className="text-xs text-muted-foreground">{type.conditionNote}</p>}
            {document?.status === "REJECTED" && document.rejectionReason && (
              <p className="text-sm text-red-600">Rejected: {document.rejectionReason}</p>
            )}

            <form action={submitSellerDocumentAction} className="flex flex-col gap-3">
              <input type="hidden" name="documentTypeId" value={type.id} />
              <FileUploadField name="fileUrl" label={document ? "Replace document" : "Upload document"} folder="compliance" required />
              <Button type="submit" variant="secondary" size="sm" className="self-start">
                {document ? "Submit new version" : "Submit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
