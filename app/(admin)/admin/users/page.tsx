import { requirePermission } from "@/lib/auth/rbac";
import { ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants/roles";
import { listUsers } from "@/services/users/user.service";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";

export default async function AdminUsersPage() {
  await requirePermission("users.manage");
  const { items: users, totalCount } = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Users ({totalCount})</h1>

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
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[user.role]}</td>
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
