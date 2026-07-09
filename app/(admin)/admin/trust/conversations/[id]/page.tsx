import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/rbac";
import { getConversationForAdmin } from "@/services/messaging/conversation.service";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants/routes";

export default async function AdminConversationViewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("support.messages");
  const { id } = await params;

  let conversation;
  try {
    conversation = await getConversationForAdmin(id, admin.id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.admin.root },
          { label: "Trust & Safety", href: ROUTES.admin.trustDashboard },
          { label: "Conversation" },
        ]}
        title={`${conversation.buyer.firstName} ${conversation.buyer.lastName} ↔ ${conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}`}
        description={conversation.product ? `About: ${conversation.product.title}` : conversation.type.replace("_", " ").toLowerCase()}
      />

      {conversation.isReported && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4 text-sm text-red-900">
            <p className="font-medium">Reported: {conversation.reportReason}</p>
            <p className="text-xs text-red-700">{conversation.reportedAt?.toLocaleString("en-NG")}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          {conversation.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
          ) : (
            conversation.messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-secondary-foreground">
                    {message.sender.firstName} {message.sender.lastName}
                  </p>
                  <span className="text-xs text-muted-foreground">{message.createdAt.toLocaleString("en-NG")}</span>
                  {message.flag && <Badge tone="danger">{message.flag.flagType.replace("_", " ").toLowerCase()}</Badge>}
                </div>
                <p className="text-sm text-foreground">{message.body}</p>
                {message.flag && <p className="text-xs text-muted-foreground">Matched: {message.flag.matchedSnippet}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
