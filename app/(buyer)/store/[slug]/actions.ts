"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getOrCreateConversation } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";

export async function startConversationAction(sellerProfileId: string) {
  const session = await requireAuth();
  const conversation = await getOrCreateConversation(session.userId, sellerProfileId);
  redirect(ROUTES.message(conversation.id));
}
