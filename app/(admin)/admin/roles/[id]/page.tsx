import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getStaffRole } from "@/services/platform/staff-role.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PermissionCheckboxes } from "@/components/admin/PermissionCheckboxes";
import { ROUTES } from "@/lib/constants/routes";
import { updateStaffRoleAction, deleteStaffRoleAction } from "../actions";

export default async function AdminStaffRoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.SUPER_ADMIN);
  const { id } = await params;
  const role = await getStaffRole(id);
  if (!role) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Staff roles", href: ROUTES.admin.roles }, { label: role.name }]}
        title={role.name}
        description={role.isSystemDefined ? "Seeded default role — still fully editable." : "Custom role."}
      />

      <Card>
        <CardContent className="p-5">
          <form action={updateStaffRoleAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={role.id} />
            <Input name="name" label="Role name" defaultValue={role.name} required />
            <Input name="description" label="Description" defaultValue={role.description ?? ""} />
            <PermissionCheckboxes defaultChecked={role.permissions.map((p) => p.permission)} />
            <Button type="submit" variant="accent" className="self-start">
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this role</p>
            <p className="text-xs text-muted-foreground">Only possible while no admin is currently assigned to it.</p>
          </div>
          <form action={deleteStaffRoleAction}>
            <input type="hidden" name="id" value={role.id} />
            <Button type="submit" variant="outline">
              Delete role
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
