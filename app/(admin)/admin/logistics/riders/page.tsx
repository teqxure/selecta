import { requirePermission } from "@/lib/auth/rbac";
import { listRiders } from "@/services/logistics/rider.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Bike } from "lucide-react";
import { setRiderActiveAction } from "./actions";
import { CreateRiderForm } from "./create-rider-form";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  OFFLINE: "neutral",
  AVAILABLE: "success",
  ON_DELIVERY: "warning",
  BREAK: "neutral",
};

export default async function AdminRidersPage() {
  await requirePermission("MANAGE_LOGISTICS");
  const riders = await listRiders();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Riders" }]}
        title="Rider roster"
        description="In-house delivery riders and their performance."
      />

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
