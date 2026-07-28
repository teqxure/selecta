import { z } from "zod";

export const assistantChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1, "Message can't be empty").max(2000, "Message is too long"),
  /** Guest-only client-held history — ignored server-side for authenticated buyers, whose history comes from the database instead. */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(60)
    .optional(),
  context: z.object({
    pathname: z.string().max(500).optional(),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    searchQuery: z.string().max(200).optional(),
  }),
});

export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;
