"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateAiAssistantSettings } from "@/services/platform/ai-assistant-settings.service";
import { ROUTES } from "@/lib/constants/routes";

export async function updateAiAssistantSettingsAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  const suggestedPrompts = String(formData.get("suggestedPrompts") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  await updateAiAssistantSettings(session.userId, {
    isEnabled: formData.get("isEnabled") === "on",
    isFloatingButtonEnabled: formData.get("isFloatingButtonEnabled") === "on",
    streamingEnabled: formData.get("streamingEnabled") === "on",
    welcomeMessage: String(formData.get("welcomeMessage") || ""),
    placeholderText: String(formData.get("placeholderText") || ""),
    suggestedPrompts,
    maxConversationLength: Number(formData.get("maxConversationLength") || 30),
    temperature: Number(formData.get("temperature") || 0.7),
    systemPrompt: String(formData.get("systemPrompt") || ""),
  });

  revalidatePath(ROUTES.admin.aiAssistant);
}
