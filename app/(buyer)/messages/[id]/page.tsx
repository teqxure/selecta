import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/current-user";
import { listMessages, markConversationRead } from "@/services/messaging/conversation.service";
import { listOffersForConversation } from "@/services/messaging/offer.service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { ROUTES } from "@/lib/constants/routes";
import { MessageThread } from "@/components/messaging/MessageThread";
import { ConversationActions } from "@/components/messaging/ConversationActions";
import { BuyerOfferPanel } from "@/components/messaging/BuyerOfferPanel";
import { sendBuyerMessageAction, archiveBuyerConversationAction, reportBuyerConversationAction } from "../actions";

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

  const offers = conversation.type === "PRODUCT_INQUIRY" ? await listOffersForConversation(id) : [];

  const boundSend = sendBuyerMessageAction.bind(null, id);
  const boundArchive = archiveBuyerConversationAction.bind(null, id);
  const boundReport = reportBuyerConversationAction.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-12">
      <ConversationActions isReported={conversation.isReported} archiveAction={boundArchive} reportAction={boundReport} listHref={ROUTES.messages} />
      <BuyerOfferPanel
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
        currentUserId={user.id}
        otherPartyName={conversation.sellerProfile.storeName ?? conversation.sellerProfile.businessName}
        sendAction={boundSend}
        uploadFolder="messages"
      />
    </div>
  );
}
