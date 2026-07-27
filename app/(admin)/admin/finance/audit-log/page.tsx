import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listAuditLogs, listAuditLogEntityTypes } from "@/services/platform/audit-log.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileClock } from "lucide-react";

interface AdminAuditLogPageProps {
  searchParams: Promise<{ q?: string; entityType?: string; page?: string }>;
}

export default async function AdminAuditLogPage({ searchParams }: AdminAuditLogPageProps) {
  await requireRole(Role.SUPER_ADMIN);
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items: entries, totalPages }, entityTypes] = await Promise.all([
    listAuditLogs(page, 50, { entityType: params.entityType || undefined, search: params.q?.trim() || undefined }),
    listAuditLogEntityTypes(),
  ]);

  const buildQuery = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { q: params.q, entityType: params.entityType, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    return `${ROUTES.admin.financeAuditLog}?${next.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Audit log" }]}
        title="Audit log"
        description="Every mutation logged with who, when, what changed, and from where — the platform's security record."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <form action={ROUTES.admin.financeAuditLog} className="flex flex-1 items-end gap-3">
            {params.entityType && <input type="hidden" name="entityType" value={params.entityType} />}
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
                Search action or entity ID
              </label>
              <input
                id="q"
                name="q"
                defaultValue={params.q}
                placeholder="e.g. staff_role.update"
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Link
              href={buildQuery({ entityType: undefined, page: undefined })}
              className={`rounded-full px-2.5 py-1 ${!params.entityType ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
            >
              All types
            </Link>
            {entityTypes.map((type) => (
              <Link
                key={type}
                href={buildQuery({ entityType: type, page: undefined })}
                className={`rounded-full px-2.5 py-1 ${params.entityType === type ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
              >
                {type}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          {entries.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={FileClock} title="No audit entries" description="Nothing matches these filters yet." />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {entry.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : <span className="text-muted-foreground">System</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <Badge tone="neutral">{entry.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.entityType} · <span className="font-mono text-xs">{entry.entityId.slice(-10)}</span>
                      {entry.metadata != null && (
                        <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground/80">
                          {JSON.stringify(entry.metadata, null, 0)}
                        </pre>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
