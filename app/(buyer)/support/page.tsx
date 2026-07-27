import Link from "next/link";
import { requireAuth } from "@/lib/auth/rbac";
import { listTicketsForUser } from "@/services/support/ticket.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Ticket } from "lucide-react";
import { CreateTicketForm } from "./create-ticket-form";

const STATUS_TONE: Record<string, "warning" | "neutral" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export default async function SupportPage() {
  const session = await requireAuth();
  const tickets = await listTicketsForUser(session.userId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Support</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {tickets.length === 0 && <EmptyState icon={Ticket} title="No tickets yet" description="Submit one below if you need help." />}
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={ROUTES.supportTicket(ticket.id)} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{ticket.subject}</span>
                  <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{ticket.createdAt.toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
