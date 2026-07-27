import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getTicketForAdmin } from "@/services/support/ticket.service";
import { db } from "@/lib/db";
import { Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import {
  replyToTicketAction,
  assignTicketAction,
  setTicketStatusAction,
  setTicketPriorityAction,
} from "../actions";

export default async function AdminSupportTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("support.messages");
  const { id } = await params;
  const ticket = await getTicketForAdmin(id);
  if (!ticket) notFound();

  const admins = await db.user.findMany({ where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } }, select: { id: true, firstName: true, lastName: true } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Support tickets", href: ROUTES.admin.supportTickets }, { label: ticket.subject }]}
        title={ticket.subject}
        description={`${ticket.user.firstName} ${ticket.user.lastName} · ${ticket.category ?? "General"}`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Status</CardTitle>
            <Badge tone="neutral">{ticket.status.replaceAll("_", " ")}</Badge>
            <Badge tone="neutral">{ticket.priority}</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <form action={setTicketStatusAction} className="flex items-end gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <select name="status" defaultValue={ticket.status} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <Button type="submit" size="sm" variant="outline">
              Update status
            </Button>
          </form>

          <form action={setTicketPriorityAction} className="flex items-end gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <select name="priority" defaultValue={ticket.priority} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent (escalate)</option>
            </select>
            <Button type="submit" size="sm" variant="outline">
              Update priority
            </Button>
          </form>

          <form action={assignTicketAction} className="flex items-end gap-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <select name="assignedToId" defaultValue={ticket.assignedToId ?? ""} className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
              <option value="">Unassigned</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.firstName} {admin.lastName}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" variant="outline">
              Assign
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{ticket.description}</p>
          {ticket.messages.map((message) => (
            <div key={message.id} className={`flex flex-col gap-0.5 ${message.senderId === ticket.userId ? "" : "items-end"}`}>
              <span className="text-xs font-medium text-muted-foreground">{message.sender.firstName} {message.sender.lastName}</span>
              <p className="max-w-md rounded-lg border border-border p-2.5 text-sm text-foreground">{message.body}</p>
              <span className="text-xs text-muted-foreground">{message.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
            </div>
          ))}

          {ticket.status !== "CLOSED" && (
            <form action={replyToTicketAction} className="flex items-end gap-2 border-t border-border pt-3">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="body"
                required
                rows={2}
                placeholder="Reply to buyer…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <SubmitButton size="sm" variant="accent">
                Send
              </SubmitButton>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
