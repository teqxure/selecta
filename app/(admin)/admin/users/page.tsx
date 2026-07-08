import { requirePermission } from "@/lib/auth/rbac";
import { Role, ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants/roles";
import { listUsers } from "@/services/users/user.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { changeUserRoleAction } from "./actions";

const ALL_ROLES = Object.values(Role);

export default async function AdminUsersPage() {
  const session = await requirePermission("users.manage");
  const { items: users, totalCount } = await listUsers();
  const canManageRoles = session.role === Role.SUPER_ADMIN;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Users ({totalCount})</h1>
        {canManageRoles && (
          <p className="mt-1 text-sm text-muted-foreground">
            As Super Admin, you can change any account&apos;s role here, including granting or removing Super Admin
            itself. You can&apos;t change your own role from this page, and the last active Super Admin can&apos;t be
            demoted.
          </p>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-secondary-foreground">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {canManageRoles && user.id !== session.id ? (
                      <form action={changeUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                        >
                          {ALL_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline">
                          Save
                        </Button>
                      </form>
                    ) : (
                      ROLE_LABELS[user.role]
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[user.status]}>{USER_STATUS_LABELS[user.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
