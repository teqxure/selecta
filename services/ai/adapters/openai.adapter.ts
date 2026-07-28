import "server-only";
import { ConflictError } from "@/lib/errors";
import { fetchWithTimeoutAndRetry } from "@/services/ai/http";
import type { AiAdapter, AiProviderConfig, GenerateTextInput, GenerateTextResult } from "@/services/ai/types";

/** Fallbacks only — never the sole source of truth. Both are overridden by IntegrationSetting.config when an admin sets them (see Step 6 / integration-providers.ts). */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAiChatResponse {
  choices?: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string };
}

/**
 * All OpenAI-specific request/response shaping lives in this one file —
 * no other module in the app knows OpenAI's chat-completions schema.
 * Constructed by the provider resolver with an already-decrypted API key
 * and the provider's `config` JSON; never reads secrets or settings
 * itself, and never touches the database.
 */
export function createOpenAiAdapter(apiKey: string, config: AiProviderConfig): AiAdapter {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const model = config.model ?? DEFAULT_MODEL;

  return {
    provider: "openai",
    model,

    async generateText({ messages, maxTokens = 300, temperature = 0.7 }: GenerateTextInput): Promise<GenerateTextResult> {
      const response = await fetchWithTimeoutAndRetry(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      const json = (await response.json()) as OpenAiChatResponse;

      if (!response.ok || !json.choices?.[0]?.message?.content) {
        throw new ConflictError(`AI generation failed: ${json.error?.message ?? response.statusText}`);
      }

      return {
        text: json.choices[0].message.content.trim(),
        usage: json.usage && {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          totalTokens: json.usage.total_tokens,
        },
      };
    },
  };
}
