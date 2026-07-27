import { requirePermission } from "@/lib/auth/rbac";
import { listRiders } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bike, ShieldCheck } from "lucide-react";
import { setRiderActiveAction, approveRiderVerificationAction, rejectRiderVerificationAction } from "./actions";
import { CreateRiderForm } from "./create-rider-form";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  OFFLINE: "neutral",
  AVAILABLE: "success",
  ON_DELIVERY: "warning",
  BREAK: "neutral",
};

const VERIFICATION_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  VERIFIED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  SUSPENDED: "neutral",
};

export default async function AdminRidersPage() {
  await requirePermission("MANAGE_LOGISTICS");
  const riders = await listRiders();
  const pendingApplications = riders.filter((rider) => rider.verificationStatus === "PENDING" && rider.verification);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Riders" }]}
        title="Rider roster"
        description="In-house delivery riders and their performance."
      />

      <Card>
        <CardHeader>
          <CardTitle>Applications awaiting review ({pendingApplications.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {pendingApplications.length === 0 && (
            <EmptyState icon={ShieldCheck} title="Nothing to review" description="No self-signup rider applications are pending." />
          )}
          {pendingApplications.map((rider) => (
            <div key={rider.id} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {rider.user.firstName} {rider.user.lastName}
                  </span>
                  <Badge tone="neutral">{rider.vehicleType ?? "No vehicle set"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rider.user.email} · {rider.vehiclePlateNumber ?? "No plate"}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {rider.verification?.idDocumentUrl && (
                    <a href={rider.verification.idDocumentUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      ID document
                    </a>
                  )}
                  {rider.verification?.licenseDocumentUrl && (
                    <a href={rider.verification.licenseDocumentUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      License
                    </a>
                  )}
                  {rider.verification?.vehiclePhotoUrl && (
                    <a href={rider.verification.vehiclePhotoUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      Vehicle photo
                    </a>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
                <form action={approveRiderVerificationAction}>
                  <input type="hidden" name="riderProfileId" value={rider.id} />
                  <Button type="submit" size="sm" variant="secondary">
                    Approve
                  </Button>
                </form>
                <form action={rejectRiderVerificationAction} className="flex items-end gap-2">
                  <input type="hidden" name="riderProfileId" value={rider.id} />
                  <input
                    name="notes"
                    placeholder="Rejection reason"
                    required
                    className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                  />
                  <Button type="submit" size="sm" variant="outline">
                    Reject
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All riders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {riders.length === 0 && <EmptyState icon={Bike} title="No riders yet" description="Create one below." />}
          {riders.map((rider) => (
            <div key={rider.id} className="flex items-center justify-between rounded-xl border border-border p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {rider.user.firstName} {rider.user.lastName}
                  </span>
                  <Badge tone={STATUS_TONE[rider.status]}>{rider.status.replaceAll("_", " ")}</Badge>
                  <Badge tone={VERIFICATION_TONE[rider.verificationStatus]}>{rider.verificationStatus}</Badge>
                  <Badge tone={rider.isActive ? "success" : "neutral"}>{rider.isActive ? "Active" : "Deactivated"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rider.user.email} · {rider.vehicleType ?? "No vehicle set"} · {rider.totalDeliveries} deliveries ·{" "}
                  {rider.ratingCount > 0 ? `${rider.ratingAverage.toFixed(1)}★` : "Unrated"}
                </p>
              </div>
              <form action={setRiderActiveAction}>
                <input type="hidden" name="riderProfileId" value={rider.id} />
                <input type="hidden" name="isActive" value={String(!rider.isActive)} />
                <Button type="submit" size="sm" variant={rider.isActive ? "outline" : "secondary"}>
                  {rider.isActive ? "Deactivate" : "Activate"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New rider</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateRiderForm />
        </CardContent>
      </Card>
    </div>
  );
}
