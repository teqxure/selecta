import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getTicketForUser } from "@/services/support/ticket.service";
import { isAppError } from "@/lib/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { replyToSupportTicketAction } from "../actions";

const STATUS_TONE: Record<string, "warning" | "neutral" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "neutral",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  let ticket;
  try {
    ticket = await getTicketForUser(id, session.userId);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">{ticket.subject}</h1>
        <Badge tone={STATUS_TONE[ticket.status]}>{ticket.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-lg bg-muted/50 p-3 text-sm text-foreground">{ticket.description}</p>
          {ticket.messages.map((message) => (
            <div key={message.id} className={`flex flex-col gap-0.5 ${message.senderId === session.userId ? "items-end" : ""}`}>
              <span className="text-xs font-medium text-muted-foreground">
                {message.senderId === session.userId ? "You" : "Selecta support"}
              </span>
              <p className="max-w-md rounded-lg border border-border p-2.5 text-sm text-foreground">{message.body}</p>
              <span className="text-xs text-muted-foreground">
                {message.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          ))}

          {ticket.status !== "CLOSED" && (
            <form action={replyToSupportTicketAction} className="flex items-end gap-2 border-t border-border pt-3">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <textarea
                name="body"
                required
                rows={2}
                placeholder="Reply…"
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
