import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listConversationsForSeller } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function SellerMessagesPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const conversations = await listConversationsForSeller(profile.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Messages</h1>

      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No messages yet."
          description="When a buyer messages you from your store page, it'll show up here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conversation) => (
            <Link key={conversation.id} href={ROUTES.seller.message(conversation.id)}>
              <Card hoverable>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-foreground">
                      {conversation.buyer.firstName} {conversation.buyer.lastName}
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
