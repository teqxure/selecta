import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listConversationsForBuyer } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function BuyerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; unread?: string; archived?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);
  const { q, unread, archived } = await searchParams;

  const conversations = await listConversationsForBuyer(user.id, { q, unreadOnly: unread === "true", archived: archived === "true" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Messages</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2">
          <Link href={ROUTES.messages}>
            <Button variant={!unread && !archived ? "secondary" : "ghost"} size="sm">
              All
            </Button>
          </Link>
          <Link href={`${ROUTES.messages}?unread=true`}>
            <Button variant={unread === "true" ? "secondary" : "ghost"} size="sm">
              Unread
            </Button>
          </Link>
          <Link href={`${ROUTES.messages}?archived=true`}>
            <Button variant={archived === "true" ? "secondary" : "ghost"} size="sm">
              Archived
            </Button>
          </Link>
        </nav>
        <form action={ROUTES.messages} method="GET" className="flex items-center gap-2">
          <Input name="q" defaultValue={q ?? ""} placeholder="Search by store name…" className="w-48" />
          <Button type="submit" size="sm" variant="secondary">
            Search
          </Button>
        </form>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet."
          description="Message a seller from a product or store page to start a conversation."
          action={{ label: "Explore stores", href: ROUTES.search }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={ROUTES.message(conversation.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-secondary-foreground">
                        {conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}
                      </p>
                      {conversation.product && <Badge tone="neutral">{conversation.product.title}</Badge>}
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
