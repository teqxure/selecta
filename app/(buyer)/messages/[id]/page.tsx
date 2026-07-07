import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listMessages, markConversationRead } from "@/services/messaging/conversation.service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { MessageThread } from "@/components/messaging/MessageThread";
import { sendBuyerMessageAction } from "../actions";

export default async function BuyerMessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(ROUTES.login);

  const conversation = await db.conversation.findUnique({ where: { id }, include: { sellerProfile: true } });
  if (!conversation) notFound();

  let messages;
  try {
    messages = await listMessages(id, user.id);
    await markConversationRead(id, user.id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const boundSend = sendBuyerMessageAction.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <MessageThread
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          createdAt: m.createdAt,
          senderId: m.senderId,
          senderName: `${m.sender.firstName} ${m.sender.lastName}`,
        }))}
        currentUserId={user.id}
        otherPartyName={conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}
        sendAction={boundSend}
      />
    </div>
  );
}
