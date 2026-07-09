import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listGrowthPartnerApplications } from "@/services/monetization/growth-partner.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { updateGrowthPartnerApplicationAction } from "./actions";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  REVIEWING: "neutral",
  ACCEPTED: "success",
  REJECTED: "danger",
};

const STATUS_OPTIONS = ["PENDING", "REVIEWING", "ACCEPTED", "REJECTED"] as const;

export default async function AdminGrowthPartnersPage() {
  await requireRole(Role.SUPER_ADMIN);
  const applications = await listGrowthPartnerApplications();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Growth partners" }]}
        title="Selecta Growth Partner applications"
        description="Intake for the future managed growth service — triage applications, add notes."
      />

      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications yet.</p>
      ) : (
        applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{application.seller.storeName ?? application.seller.businessName}</CardTitle>
                <Badge tone={STATUS_TONE[application.status]}>{application.status.toLowerCase()}</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{application.seller.user.email}</p>
              {application.message && <p className="text-sm text-secondary-foreground">{application.message}</p>}
              <p className="text-xs text-muted-foreground">Submitted {application.createdAt.toLocaleDateString("en-NG")}</p>

              <form action={updateGrowthPartnerApplicationAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="applicationId" value={application.id} />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`status-${application.id}`} className="text-sm font-medium text-foreground">
                    Status
                  </label>
                  <select
                    id={`status-${application.id}`}
                    name="status"
                    defaultValue={application.status}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label htmlFor={`notes-${application.id}`} className="text-sm font-medium text-foreground">
                    Internal notes
                  </label>
                  <input
                    id={`notes-${application.id}`}
                    name="notes"
                    defaultValue={application.notes ?? ""}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  />
                </div>
                <Button type="submit" size="sm" variant="accent">
                  Save
                </Button>
              </form>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
