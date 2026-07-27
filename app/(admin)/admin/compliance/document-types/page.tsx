import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listAllDocumentTypes } from "@/services/compliance/document.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileStack } from "lucide-react";
import { setDocumentTypeActiveAction } from "./actions";
import { CreateDocumentTypeForm } from "./create-type-form";

const REQUIREMENT_TONE: Record<string, "accent" | "neutral" | "warning"> = {
  REQUIRED: "accent",
  OPTIONAL: "neutral",
  CONDITIONAL: "warning",
};

export default async function AdminDocumentTypesPage() {
  await requireRole(Role.SUPER_ADMIN);
  const types = await listAllDocumentTypes();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Document types" }]}
        title="Compliance document catalog"
        description="Not a fixed set — configure exactly which documents sellers must submit, and whether each is required, optional, or conditional."
      />

      <Card>
        <CardHeader>
          <CardTitle>Document types</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {types.length === 0 && <EmptyState icon={FileStack} title="No document types yet" description="Create one below." />}
          {types.map((type) => (
            <div key={type.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{type.name}</span>
                  <Badge tone={REQUIREMENT_TONE[type.requirement]}>{type.requirement}</Badge>
                  <Badge tone={type.isActive ? "success" : "neutral"}>{type.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                {type.category && <p className="text-xs text-muted-foreground">{type.category}</p>}
                {type.conditionNote && <p className="text-xs text-muted-foreground">{type.conditionNote}</p>}
              </div>
              <form action={setDocumentTypeActiveAction}>
                <input type="hidden" name="id" value={type.id} />
                <input type="hidden" name="isActive" value={String(!type.isActive)} />
                <Button type="submit" size="sm" variant={type.isActive ? "outline" : "secondary"}>
                  {type.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New document type</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateDocumentTypeForm />
        </CardContent>
      </Card>
    </div>
  );
}
