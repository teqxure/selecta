import "server-only";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import { generateText, generateTextStream } from "@/services/ai/ai.service";
import { getAiAssistantSettings } from "@/services/platform/ai-assistant-settings.service";
import { isFeatureEnabled } from "@/services/platform/feature-flags.service";
import { AI_KILL_SWITCH_KEY } from "@/services/monetization/entitlement.service";
import { getPublicProductById } from "@/services/products/search.service";
import { listCartItems } from "@/services/products/cart.service";
import type { GenerateTextMessage } from "@/services/ai/types";

/**
 * The buyer-facing AI feature, parallel to product-writer.service.ts, but
 * calling generateTextStream instead of generateText and adding
 * conversation persistence + inventory grounding that product-writer
 * doesn't need. Never imports a provider SDK or the resolver directly —
 * everything goes through services/ai/ai.service.ts.
 */

const ASSISTANT_MAX_TOKENS = 500;

export interface AssistantContext {
  pathname?: string;
  productId?: string;
  categoryId?: string;
  searchQuery?: string;
}

export interface AssistantHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAssistantReplyParams {
  user: { id: string } | null;
  conversationId?: string;
  message: string;
  /** Guest-only — the client's locally held prior turns. Ignored for authenticated users, whose history is loaded from the database instead. */
  history?: AssistantHistoryTurn[];
  context: AssistantContext;
}

export type AssistantStreamEvent =
  | { type: "meta"; conversationId: string }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

// ---------------------------------------------------------------------------
// Inventory grounding (v1 substitute for real tool-calling — see plan §1.3)
// ---------------------------------------------------------------------------

/** Only fires on an explicit budget cue, so an unrelated number in the message (e.g. "iPhone 15") isn't mistaken for a price ceiling. */
function extractPriceCeiling(message: string): number | undefined {
  const hasBudgetCue = /(under|below|less than|budget|within|max(?:imum)?|cheaper than)/i.test(message);
  if (!hasBudgetCue) return undefined;
  const match = message.match(/[\d][\d,]{2,}/);
  if (!match) return undefined;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

async function findMentionedCategoryId(message: string, contextCategoryId?: string): Promise<string | undefined> {
  if (contextCategoryId) return contextCategoryId;
  const categories = await db.category.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const lower = message.toLowerCase();
  return categories.find((category) => lower.includes(category.name.toLowerCase()))?.id;
}

interface GroundedProduct {
  title: string;
  price: number;
  brand: string | null;
  categoryName: string;
}

/**
 * A plain db.product.findMany, NOT searchProducts() from search.service.ts
 * — that function has real side effects (writing SearchQuery/ProductEvent
 * rows for genuine buyer searches), which must not fire for every AI
 * grounding lookup behind the scenes.
 */
async function groundWithInventory(message: string, context: AssistantContext): Promise<GroundedProduct[]> {
  const priceCeiling = extractPriceCeiling(message);
  const categoryId = await findMentionedCategoryId(message, context.categoryId);

  const products = await db.product.findMany({
    where: {
      status: "ACTIVE",
      ...(priceCeiling && { price: { lte: priceCeiling } }),
      ...(categoryId && { categoryId }),
    },
    select: { title: true, price: true, brand: true, category: { select: { name: true } } },
    orderBy: { viewCount: "desc" },
    take: 5,
  });

  return products.map((p) => ({ title: p.title, price: Number(p.price), brand: p.brand, categoryName: p.category.name }));
}

function formatGroundedProducts(products: GroundedProduct[]): string {
  if (products.length === 0) {
    return "No specific matching products were found in the current catalog for this query — say so plainly rather than inventing an item.";
  }
  return products
    .map((p) => `- ${p.title}${p.brand ? ` (${p.brand})` : ""} — ₦${p.price.toLocaleString()} — ${p.categoryName}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Marketplace-awareness context (resolved lazily, server-side — see plan §1.5)
// ---------------------------------------------------------------------------

async function resolveMarketplaceContext(context: AssistantContext, userId?: string): Promise<string> {
  const lines: string[] = [];

  if (context.productId) {
    try {
      const product = await getPublicProductById(context.productId);
      lines.push(
        `The buyer is currently viewing this product: "${product.title}" — ₦${Number(product.price).toLocaleString()}, ` +
          `category: ${product.category.name}, brand: ${product.brand ?? "n/a"}, condition: ${product.conditionGrade}.`,
      );
    } catch {
      // Product not found/no longer active — not fatal to the conversation, just omit it from context.
    }
  } else if (context.categoryId) {
    const category = await db.category.findUnique({ where: { id: context.categoryId }, select: { name: true } });
    if (category) lines.push(`The buyer is currently browsing the "${category.name}" category.`);
  }

  if (context.searchQuery) {
    lines.push(`The buyer is currently searching for: "${context.searchQuery}".`);
  }

  if (userId) {
    const items = await listCartItems(userId);
    if (items.length > 0) {
      const subtotal = items.reduce((sum, item) => sum + Number(item.product.price), 0);
      const titles = items.slice(0, 5).map((item) => item.product.title);
      lines.push(
        `The buyer's cart has ${items.length} item(s)${items.length > 5 ? " (showing first 5)" : ""}: ${titles.join(", ")} — subtotal ₦${subtotal.toLocaleString()}.`,
      );
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main entry point — called from app/api/assistant/chat/route.ts
// ---------------------------------------------------------------------------

export async function* streamAssistantReply(params: StreamAssistantReplyParams): AsyncGenerator<AssistantStreamEvent> {
  const settings = await getAiAssistantSettings();

  // Defense in depth — the route handler and the buyer layout both already
  // gate on this, but neither is a security boundary on its own.
  if (!settings.isEnabled || (await isFeatureEnabled(AI_KILL_SWITCH_KEY))) {
    yield { type: "error", message: "The assistant is currently unavailable." };
    return;
  }

  const trimmedMessage = params.message.trim();
  if (!trimmedMessage) {
    yield { type: "error", message: "Message can't be empty." };
    return;
  }

  let conversationId: string | undefined;
  let priorTurns: AssistantHistoryTurn[] = [];

  if (params.user) {
    let conversation = params.conversationId
      ? await db.aiConversation.findFirst({ where: { id: params.conversationId, userId: params.user.id } })
      : null;

    if (!conversation) {
      conversation = await db.aiConversation.create({ data: { userId: params.user.id, title: trimmedMessage.slice(0, 80) } });
      yield { type: "meta", conversationId: conversation.id };
    }
    conversationId = conversation.id;

    const existing = await db.aiConversationMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: settings.maxConversationLength,
    });

    if (existing.length >= settings.maxConversationLength) {
      yield { type: "error", message: "This conversation has reached its maximum length — start a new conversation to keep chatting." };
      return;
    }

    priorTurns = existing.reverse().map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

    await db.aiConversationMessage.create({ data: { conversationId: conversation.id, role: "USER", content: trimmedMessage } });
  } else {
    priorTurns = (params.history ?? []).slice(-settings.maxConversationLength);
  }

  const [contextText, groundedProducts] = await Promise.all([
    resolveMarketplaceContext(params.context, params.user?.id),
    groundWithInventory(trimmedMessage, params.context),
  ]);

  const messages: GenerateTextMessage[] = [
    { role: "system", content: settings.systemPrompt },
    ...(contextText ? [{ role: "system" as const, content: `Current context:\n${contextText}` }] : []),
    { role: "system", content: `Relevant products currently in the catalog (only mention these if relevant — never invent others):\n${formatGroundedProducts(groundedProducts)}` },
    ...priorTurns.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: "user", content: trimmedMessage },
  ];

  let fullText = "";
  let promptTokens: number | undefined;
  let completionTokens: number | undefined;

  try {
    if (settings.streamingEnabled) {
      for await (const event of generateTextStream({ messages, temperature: settings.temperature, maxTokens: ASSISTANT_MAX_TOKENS })) {
        if (event.type === "delta") {
          fullText += event.text;
          yield { type: "delta", text: event.text };
        } else {
          promptTokens = event.result.usage?.promptTokens;
          completionTokens = event.result.usage?.completionTokens;
        }
      }
    } else {
      const result = await generateText({ messages, temperature: settings.temperature, maxTokens: ASSISTANT_MAX_TOKENS });
      fullText = result.text;
      promptTokens = result.usage?.promptTokens;
      completionTokens = result.usage?.completionTokens;
      yield { type: "delta", text: fullText };
    }
  } catch (error) {
    yield { type: "error", message: isAppError(error) ? error.message : "Something went wrong generating a response — please try again." };
    return;
  }

  if (conversationId && fullText) {
    await db.aiConversationMessage.create({
      data: { conversationId, role: "ASSISTANT", content: fullText, promptTokens, completionTokens },
    });
    await db.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  }

  yield { type: "done" };
}

export interface AssistantConversationSummary {
  id: string;
  messages: { role: "user" | "assistant"; content: string; createdAt: Date }[];
}

/** Powers "continue conversation" for an authenticated buyer — the most recently updated, non-archived thread. */
export async function getLatestAssistantConversation(userId: string): Promise<AssistantConversationSummary | null> {
  const conversation = await db.aiConversation.findFirst({
    where: { userId, isArchived: false },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return null;

  return {
    id: conversation.id,
    messages: conversation.messages
      .filter((m) => m.role !== "SYSTEM")
      .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content, createdAt: m.createdAt })),
  };
}

/** "Clear conversation" — archives rather than deletes, so a mis-tap doesn't destroy history outright. */
export async function archiveAssistantConversation(userId: string, conversationId: string): Promise<void> {
  await db.aiConversation.updateMany({ where: { id: conversationId, userId }, data: { isArchived: true } });
}

/** "Delete conversation" — a real delete, ownership-scoped in the query itself (see lib/auth/rbac.ts's requireOwnership doc comment). */
export async function deleteAssistantConversation(userId: string, conversationId: string): Promise<void> {
  await db.aiConversation.deleteMany({ where: { id: conversationId, userId } });
}
