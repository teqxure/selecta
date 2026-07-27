import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { listTicketQueue } from "@/services/support/ticket.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Ticket } from "lucide-react";
import type { SupportTicketStatus } from "@/generated/prisma/enums";

const STATUSES: SupportTicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_TONE: Record<string, "warning" | "neutral" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
};

const PRIORITY_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  NORMAL: "neutral",
  HIGH: "warning",
  URGENT: "danger",
};

export default async function AdminSupportTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("support.messages");
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as SupportTicketStatus) ? (status as SupportTicketStatus) : undefined;

  const tickets = await listTicketQueue(filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Support tickets" }]}
        title="Support tickets"
        description="General buyer help requests that aren't order-specific disputes."
      />

      <Card>
        <CardContent className="flex flex-wrap gap-1.5 p-4 text-xs">
          <Link
            href={ROUTES.admin.supportTickets}
            className={`rounded-full px-2.5 py-1 ${!filter ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`${ROUTES.admin.supportTickets}?status=${s}`}
              className={`rounded-full px-2.5 py-1 ${filter === s ? "bg-accent/15 text-accent" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s.replaceAll("_", " ")}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {tickets.length === 0 && <EmptyState icon={Ticket} title="Nothing here" description="No tickets match this filter." />}
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={ROUTES.admin.supportTicket(ticket.id)}>
            <Card className="transition-colors hover:border-accent/40">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{ticket.subject}</span>
                    <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
                    {ticket.priority !== "NORMAL" && <Badge tone={PRIORITY_TONE[ticket.priority]}>{ticket.priority}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ticket.user.firstName} {ticket.user.lastName} · {ticket.category ?? "General"}
                    {ticket.assignedTo && ` · Assigned to ${ticket.assignedTo.firstName}`}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{ticket.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
