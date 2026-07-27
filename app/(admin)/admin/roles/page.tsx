import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listStaffRoles } from "@/services/platform/staff-role.service";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PermissionCheckboxes } from "@/components/admin/PermissionCheckboxes";
import { ROUTES } from "@/lib/constants/routes";
import { createStaffRoleAction } from "./actions";

export default async function AdminRolesPage() {
  await requireRole(Role.SUPER_ADMIN);
  const roles = await listStaffRoles();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Permission Engine" }]}
        title="Staff roles"
        description="Founder can create unlimited custom roles — each a named, reusable bundle of permissions. Assign one to an admin from their profile alongside any individually-granted permissions."
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {roles.map((role) => (
          <Link key={role.id} href={ROUTES.admin.role(role.id)}>
            <Card hoverable>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{role.name}</span>
                  {role.isSystemDefined && <Badge tone="neutral">Default</Badge>}
                </div>
                {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"} · {role._count.users} admin
                  {role._count.users === 1 ? "" : "s"} assigned
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New role</CardTitle>
          <CardDescription>Give it a name and check every permission it should grant.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createStaffRoleAction} className="flex flex-col gap-4">
            <Input name="name" label="Role name" placeholder="Finance Manager" required />
            <Input name="description" label="Description (optional)" placeholder="Full visibility into escrow, settlements, and revenue reports" />
            <PermissionCheckboxes />
            <Button type="submit" variant="accent" className="self-start">
              Create role
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
