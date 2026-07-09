"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/rbac";
import { getOrCreateConversation } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { checkConversationRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function startConversationAction(sellerProfileId: string) {
  const session = await requireAuth();
  if (!(await checkConversationRateLimit(session.userId)).allowed) throw new RateLimitError();
  const conversation = await getOrCreateConversation(session.userId, sellerProfileId);
  redirect(ROUTES.message(conversation.id));
}
