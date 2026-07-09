import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listConversationsForSeller } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function SellerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; unread?: string; archived?: string }>;
}) {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const { q, unread, archived } = await searchParams;

  const conversations = await listConversationsForSeller(profile.id, session.userId, {
    q,
    unreadOnly: unread === "true",
    archived: archived === "true",
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Messages</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          <Link href={ROUTES.seller.messages}>
            <Button variant={!unread && !archived ? "secondary" : "ghost"} size="sm">
              All
            </Button>
          </Link>
          <Link href={`${ROUTES.seller.messages}?unread=true`}>
            <Button variant={unread === "true" ? "secondary" : "ghost"} size="sm">
              Unread
            </Button>
          </Link>
          <Link href={`${ROUTES.seller.messages}?archived=true`}>
            <Button variant={archived === "true" ? "secondary" : "ghost"} size="sm">
              Archived
            </Button>
          </Link>
        </nav>
        <form action={ROUTES.seller.messages} method="GET" className="flex items-center gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by buyer name…" className="w-56" />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No messages yet."
          description="When a buyer messages you from your store or a listing, it'll show up here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={ROUTES.seller.message(conversation.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-secondary-foreground">
                        {conversation.buyer.firstName} {conversation.buyer.lastName}
                      </p>
                      {conversation.product && <Badge tone="neutral">{conversation.product.title}</Badge>}
                      <Badge tone={conversation.type === "DISPUTE_DISCUSSION" ? "danger" : conversation.type === "ORDER_SUPPORT" ? "warning" : "neutral"}>
                        {conversation.type.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{conversation.messages[0]?.body ?? "Sent a photo"}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
