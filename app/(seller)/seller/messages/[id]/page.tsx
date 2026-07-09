import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { listMessages, markConversationRead } from "@/services/messaging/conversation.service";
import { listOffersForConversation } from "@/services/messaging/offer.service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { MessageThread } from "@/components/messaging/MessageThread";
import { ConversationActions } from "@/components/messaging/ConversationActions";
import { SellerOfferPanel } from "@/components/messaging/SellerOfferPanel";
import { sendSellerMessageAction, archiveSellerConversationAction, reportSellerConversationAction } from "../actions";

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

  const offers = conversation.type === "PRODUCT_INQUIRY" ? await listOffersForConversation(id) : [];

  const boundSend = sendSellerMessageAction.bind(null, id);
  const boundArchive = archiveSellerConversationAction.bind(null, id);
  const boundReport = reportSellerConversationAction.bind(null, id);

  return (
    <div className="flex flex-col gap-3">
      <ConversationActions isReported={conversation.isReported} archiveAction={boundArchive} reportAction={boundReport} listHref={ROUTES.seller.messages} />
      <SellerOfferPanel
        conversationId={id}
        offers={offers.map((o) => ({ id: o.id, amount: Number(o.amount), status: o.status, productTitle: o.product.title }))}
      />
      <MessageThread
        messages={messages.map((m) => ({
          id: m.id,
          body: m.body,
          imageUrl: m.imageUrl,
          createdAt: m.createdAt,
          senderId: m.senderId,
          senderName: `${m.sender.firstName} ${m.sender.lastName}`,
          readAt: m.readAt,
        }))}
        currentUserId={session.userId}
        otherPartyName={`${conversation.buyer.firstName} ${conversation.buyer.lastName}`}
        sendAction={boundSend}
        uploadFolder="messages"
      />
    </div>
  );
}
