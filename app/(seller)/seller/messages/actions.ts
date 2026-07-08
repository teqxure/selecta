"use server";

import { revalidatePath } from "next/cache";
import { requireActiveRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { sendMessage } from "@/services/messaging/conversation.service";
import { ROUTES } from "@/lib/constants/routes";
import { checkMessageRateLimit } from "@/lib/security/rate-limit";
import { RateLimitError } from "@/lib/errors";

export async function sendSellerMessageAction(conversationId: string, formData: FormData) {
  const user = await requireActiveRole(Role.SELLER);
  if (!checkMessageRateLimit(user.id).allowed) throw new RateLimitError();
  await sendMessage(conversationId, user.id, String(formData.get("body") ?? ""));
  revalidatePath(ROUTES.seller.message(conversationId));
}
