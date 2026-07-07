import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listMessages, markConversationRead } from "@/services/messaging/conversation.service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { MessageThread } from "@/components/messaging/MessageThread";
import { sendSellerMessageAction } from "../actions";

export default async function SellerMessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);

  const conversation = await db.conversation.findUnique({ where: { id }, include: { buyer: true } });
  if (!conversation || conversation.sellerProfileId !== profile.id) notFound();

  let messages;
  try {
    messages = await listMessages(id, session.userId);
    await markConversationRead(id, session.userId);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const boundSend = sendSellerMessageAction.bind(null, id);

  return (
    <MessageThread
      messages={messages.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt,
        senderId: m.senderId,
        senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      }))}
      currentUserId={session.userId}
      otherPartyName={`${conversation.buyer.firstName} ${conversation.buyer.lastName}`}
      sendAction={boundSend}
    />
  );
}
