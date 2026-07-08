"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { sendMessage } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { checkMessageRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function sendBuyerMessageAction(conversationId: string, formData: FormData) {
  const session = await requireAuth();
  if (!checkMessageRateLimit(session.userId).allowed) throw new RateLimitError();
  await sendMessage(conversationId, session.userId, String(formData.get("body") ?? ""));
  revalidatePath(ROUTES.message(conversationId));
}
