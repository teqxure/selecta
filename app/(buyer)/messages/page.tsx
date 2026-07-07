import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { currentUser } from "@/lib/auth/current-user";
import { listConversationsForBuyer } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function BuyerMessagesPage() {
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const conversations = await listConversationsForBuyer(user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold text-foreground">Messages</h1>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet."
          description="Message a seller from their store page to start a conversation."
          action={{ label: "Explore stores", href: ROUTES.search }}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={ROUTES.message(conversation.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-foreground">
                      {conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {conversation.messages[0]?.body ?? "No messages yet"}
                    </p>
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
