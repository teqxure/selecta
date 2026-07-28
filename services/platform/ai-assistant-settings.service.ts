import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const SINGLETON_ID = "singleton";

const DEFAULT_SUGGESTED_PROMPTS = [
  "Find a laptop under ₦800,000",
  "Recommend office chairs",
  "Compare two phones",
  "Help me furnish my apartment",
  "Find gifts under ₦50,000",
];

const DEFAULT_SYSTEM_PROMPT =
  "You are the Selecta Assistant, a friendly and knowledgeable shopping guide for the Selecta marketplace. " +
  "Help buyers find, compare, and understand products, and answer marketplace questions (returns, shipping, trust & safety). " +
  "Only recommend products that appear in the inventory context you're given — never invent a product, price, or seller. " +
  "Keep answers concise and focused on helping the buyer decide. If you don't have enough information, ask a clarifying question instead of guessing.";

/** Creates the row with defaults on first read — nothing to configure before launch. */
export async function getAiAssistantSettings() {
  return db.aiAssistantSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID, suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS, systemPrompt: DEFAULT_SYSTEM_PROMPT },
  });
}

/** `suggestedPrompts` is a Json column — this is the one place that trusts its shape, everywhere else consumes a plain string[]. */
export function readSuggestedPrompts(suggestedPrompts: Prisma.JsonValue): string[] {
  return Array.isArray(suggestedPrompts) ? suggestedPrompts.filter((p): p is string => typeof p === "string") : [];
}

export interface AiAssistantSettingsInput {
  isEnabled?: boolean;
  isFloatingButtonEnabled?: boolean;
  welcomeMessage?: string;
  placeholderText?: string;
  suggestedPrompts?: string[];
  maxConversationLength?: number;
  systemPrompt?: string;
  temperature?: number;
  streamingEnabled?: boolean;
}

export async function updateAiAssistantSettings(adminId: string, data: AiAssistantSettingsInput) {
  return db.$transaction(async (tx) => {
    const settings = await tx.aiAssistantSettings.upsert({
      where: { id: SINGLETON_ID },
      update: { ...data, updatedById: adminId },
      create: {
        id: SINGLETON_ID,
        suggestedPrompts: DEFAULT_SUGGESTED_PROMPTS,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        ...data,
        updatedById: adminId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: "AI_ASSISTANT_SETTINGS_UPDATED",
        entityType: "AiAssistantSettings",
        entityId: SINGLETON_ID,
        metadata: data as object,
      },
    });

    return settings;
  });
}
