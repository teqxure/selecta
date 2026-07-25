import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listLogisticsPartners } from "@/services/logistics/delivery-config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Truck } from "lucide-react";
import { createLogisticsPartnerAction, updateLogisticsPartnerAction, setLogisticsPartnerActiveAction } from "./actions";

export default async function AdminLogisticsPartnersPage() {
  await requireRole(Role.SUPER_ADMIN);
  const partners = await listLogisticsPartners();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Logistics partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Roster of external courier/delivery partners. Data only for now — no live API integration yet; this is the
          foundation for it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Partners</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {partners.length === 0 && (
            <EmptyState icon={Truck} title="No logistics partners yet" description="Add one below — Kwik, GIG Logistics, a local dispatch rider, etc." />
          )}
          {partners.map((partner) => (
            <form key={partner.id} action={updateLogisticsPartnerAction} className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <input type="hidden" name="id" value={partner.id} />
              <div className="flex flex-wrap items-end gap-3">
                <Input name="name" label="Name" defaultValue={partner.name} required className="w-40" />
                <Input name="coverageCities" label="Coverage cities (comma-separated)" defaultValue={partner.coverageCities.join(", ")} className="w-64" />
                <Input name="estimatedMinutes" type="number" min="0" label="Est. minutes" defaultValue={partner.estimatedMinutes ?? ""} className="w-28" />
                <Badge tone={partner.isActive ? "success" : "neutral"}>{partner.isActive ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Input name="contactPhone" label="Contact phone" defaultValue={partner.contactPhone ?? ""} className="w-40" />
                <Input name="contactEmail" label="Contact email" defaultValue={partner.contactEmail ?? ""} className="w-56" />
                <Input name="pricingModel" label="Pricing model (notes)" defaultValue={partner.pricingModel ?? ""} className="w-56" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="secondary">
                  Save
                </Button>
                <Button type="submit" size="sm" variant="outline" formAction={setLogisticsPartnerActiveAction} name="isActive" value={String(!partner.isActive)}>
                  {partner.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </form>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New partner</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLogisticsPartnerAction} className="flex flex-wrap items-end gap-3">
            <Input name="name" label="Name" placeholder="GIG Logistics" required className="w-40" />
            <Input name="coverageCities" label="Coverage cities (comma-separated)" placeholder="Lagos, Abuja" className="w-64" />
            <Input name="estimatedMinutes" type="number" min="0" label="Est. minutes" placeholder="90" className="w-28" />
            <Input name="contactPhone" label="Contact phone" className="w-40" />
            <Input name="contactEmail" label="Contact email" className="w-56" />
            <Button type="submit" variant="accent">
              Add partner
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
