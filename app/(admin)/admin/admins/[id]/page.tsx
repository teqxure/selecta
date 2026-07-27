import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { getAdminActivity } from "@/services/admin/admin-management.service";
import { listStaffRoles } from "@/services/platform/staff-role.service";
import { PermissionCheckboxes } from "@/components/admin/PermissionCheckboxes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { updateAdminPermissionsAction, assignStaffRoleAction, disableAdminAction, reinstateAdminAction } from "../actions";

export default async function AdminDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(Role.SUPER_ADMIN);
  const { id } = await params;

  const admin = await db.user.findUnique({ where: { id } });
  if (!admin || admin.role !== Role.ADMIN) notFound();

  const [activity, staffRoles] = await Promise.all([getAdminActivity(admin.id), listStaffRoles()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {admin.firstName} {admin.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{admin.email}</p>
        </div>
        <Badge tone={STATUS_TONE[admin.status]}>{admin.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff role</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={assignStaffRoleAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="adminId" value={admin.id} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staffRoleId" className="text-sm font-medium text-foreground">
                Assigned role
              </label>
              <select
                id="staffRoleId"
                name="staffRoleId"
                defaultValue={admin.staffRoleId ?? ""}
                className="h-11 w-56 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
              >
                <option value="">No role — individual permissions only</option>
                {staffRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="secondary">
              Save role
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individually-granted permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateAdminPermissionsAction} className="flex flex-col gap-4">
            <input type="hidden" name="adminId" value={admin.id} />
            <PermissionCheckboxes defaultChecked={admin.permissions} />
            <Button type="submit" variant="accent" className="self-start">
              Save permissions
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          {admin.status === "SUSPENDED" ? (
            <form action={reinstateAdminAction}>
              <input type="hidden" name="adminId" value={admin.id} />
              <Button type="submit" variant="accent" size="sm">
                Reinstate admin
              </Button>
            </form>
          ) : (
            <form action={disableAdminAction}>
              <input type="hidden" name="adminId" value={admin.id} />
              <Button type="submit" variant="outline" size="sm">
                Disable admin
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {activity.length === 0 && <p className="text-sm text-muted-foreground">No recorded actions yet.</p>}
          {activity.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-border pb-2 text-sm last:border-0">
              <span className="text-foreground">
                {entry.action} — {entry.entityType}
              </span>
              <span className="text-xs text-muted-foreground">
                {entry.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
