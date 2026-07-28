"use server";

import { requireAuth } from "@/lib/auth/rbac";
import {
  getLatestAssistantConversation,
  archiveAssistantConversation,
  deleteAssistantConversation,
} from "@/services/ai/marketplace-assistant.service";

/** Powers "continue conversation" on drawer open — authenticated buyers only, guests hold their own history client-side. */
export async function getLatestAssistantConversationAction() {
  const { userId } = await requireAuth();
  return getLatestAssistantConversation(userId);
}

export async function clearAssistantConversationAction(conversationId: string) {
  const { userId } = await requireAuth();
  await archiveAssistantConversation(userId, conversationId);
}

export async function deleteAssistantConversationAction(conversationId: string) {
  const { userId } = await requireAuth();
  await deleteAssistantConversation(userId, conversationId);
}
