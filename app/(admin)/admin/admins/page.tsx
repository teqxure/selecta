import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listAdmins } from "@/services/admin/admin-management.service";
import { ADMIN_PERMISSION_LABELS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserCog } from "lucide-react";
import { CreateAdminForm } from "./create-admin-form";

export default async function AdminAdminsPage() {
  await requireRole(Role.SUPER_ADMIN);
  const admins = await listAdmins();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Admin management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only Super Admin can create admin accounts or change what they can access. Every admin only sees the pages
          their granted permissions unlock.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admins</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {admins.length === 0 && (
            <EmptyState icon={UserCog} title="No admins yet" description="Create one below to delegate platform work." />
          )}
          {admins.map((admin) => (
            <Link key={admin.id} href={ROUTES.admin.adminDetail(admin.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-secondary-foreground">
                      {admin.firstName} {admin.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{admin.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {admin.permissions.length === 0 ? (
                        <Badge tone="neutral">No permissions granted</Badge>
                      ) : (
                        admin.permissions.map((permission) => (
                          <Badge key={permission} tone="accent">
                            {ADMIN_PERMISSION_LABELS[permission as keyof typeof ADMIN_PERMISSION_LABELS] ?? permission}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                  <Badge tone={STATUS_TONE[admin.status]}>{admin.status}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New admin</CardTitle>
          <CardDescription>They can sign in immediately with this password — have them change it after.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm />
        </CardContent>
      </Card>
    </div>
  );
}
