import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { Role, ROLE_LABELS, USER_STATUS_LABELS, UserStatus } from "@/lib/constants/roles";
import { listUsers, type ListUsersFilters } from "@/services/users/user.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, STATUS_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changeUserRoleAction } from "./actions";

const ALL_ROLES = Object.values(Role);
const ALL_STATUSES = Object.values(UserStatus);

interface AdminUsersPageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    verified?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const session = await requirePermission("users.manage");
  const params = await searchParams;
  const canManageRoles = session.role === Role.SUPER_ADMIN;

  const filters: ListUsersFilters = {
    search: params.q?.trim() || undefined,
    role: ALL_ROLES.includes(params.role as Role) ? (params.role as Role) : undefined,
    status: ALL_STATUSES.includes(params.status as UserStatus) ? (params.status as UserStatus) : undefined,
    verified: params.verified === "verified" || params.verified === "unverified" ? params.verified : undefined,
    sort: params.sort === "oldest" || params.sort === "most_active" ? params.sort : "newest",
  };
  const page = Math.max(1, Number(params.page) || 1);

  const { items: users, totalCount, totalPages } = await listUsers(page, undefined, filters);

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q: params.q, role: params.role, status: params.status, verified: params.verified, sort: params.sort, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    return `${ROUTES.admin.users}?${next.toString()}`;
  };

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
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <form action={ROUTES.admin.users} className="flex flex-1 items-end gap-3">
            {params.role && <input type="hidden" name="role" value={params.role} />}
            {params.status && <input type="hidden" name="status" value={params.status} />}
            {params.verified && <input type="hidden" name="verified" value={params.verified} />}
            {params.sort && <input type="hidden" name="sort" value={params.sort} />}
            <Input name="q" defaultValue={params.q} placeholder="Search by name, email, or user ID" className="max-w-sm flex-1" />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label="Role" name="role" value={params.role} options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} buildQuery={buildQuery} />
            <FilterSelect
              label="Status"
              name="status"
              value={params.status}
              options={ALL_STATUSES.map((s) => ({ value: s, label: USER_STATUS_LABELS[s] }))}
              buildQuery={buildQuery}
            />
            <FilterSelect
              label="Verification"
              name="verified"
              value={params.verified}
              options={[
                { value: "verified", label: "Email verified" },
                { value: "unverified", label: "Not verified" },
              ]}
              buildQuery={buildQuery}
            />
            <FilterSelect
              label="Sort"
              name="sort"
              value={params.sort}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "most_active", label: "Most active" },
              ]}
              buildQuery={buildQuery}
            />
            {(params.q || params.role || params.status || params.verified || (params.sort && params.sort !== "newest")) && (
              <Link href={ROUTES.admin.users} className="text-sm text-muted-foreground hover:underline">
                Clear
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <Link href={ROUTES.admin.user(user.id)} className="hover:underline">
                      {user.firstName} {user.lastName}
                    </Link>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={buildQuery({ page: String(page - 1) })}>
              <Button size="sm" variant="outline">
                Previous
              </Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildQuery({ page: String(page + 1) })}>
              <Button size="sm" variant="outline">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
  buildQuery,
}: {
  label: string;
  name: string;
  value?: string;
  options: { value: string; label: string }[];
  buildQuery: (overrides: Record<string, string | undefined>) => string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex flex-wrap gap-1">
        <Link
          href={buildQuery({ [name]: undefined, page: undefined })}
          className={`rounded-full px-2.5 py-1 text-xs ${!value ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
        >
          All
        </Link>
        {options.map((option) => (
          <Link
            key={option.value}
            href={buildQuery({ [name]: option.value, page: undefined })}
            className={`rounded-full px-2.5 py-1 text-xs ${value === option.value ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            {option.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
