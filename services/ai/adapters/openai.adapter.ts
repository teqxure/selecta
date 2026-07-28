import "server-only";
import { ConflictError } from "@/lib/errors";
import { fetchWithTimeoutAndRetry } from "@/services/ai/http";
import type { AiAdapter, AiProviderConfig, AiUsage, GenerateTextInput, GenerateTextResult, GenerateTextStreamEvent } from "@/services/ai/types";

/** Fallbacks only — never the sole source of truth. Both are overridden by IntegrationSetting.config when an admin sets them (see Step 6 / integration-providers.ts). */
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

interface OpenAiChatResponse {
  choices?: { message: { content: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  error?: { message: string };
}

interface OpenAiStreamChunk {
  choices?: { delta?: { content?: string } }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
}

/** No new SSE chunk within this window means the upstream connection stalled — abort rather than hang forever (fetchWithTimeoutAndRetry's own timeout only bounds time-to-first-byte, not a stalled stream). */
const STREAM_IDLE_TIMEOUT_MS = 15_000;

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

    async *generateTextStream({ messages, maxTokens = 300, temperature = 0.7 }: GenerateTextInput): AsyncGenerator<GenerateTextStreamEvent> {
      const response = await fetchWithTimeoutAndRetry(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
          stream_options: { include_usage: true },
        }),
      });

      if (!response.ok || !response.body) {
        const json = (await response.json().catch(() => null)) as OpenAiChatResponse | null;
        throw new ConflictError(`AI generation failed: ${json?.error?.message ?? response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let usage: AiUsage | undefined;

      const idleController = new AbortController();
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      const resetIdleTimer = () => {
        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => idleController.abort(), STREAM_IDLE_TIMEOUT_MS);
      };
      resetIdleTimer();

      try {
        while (true) {
          const readPromise = reader.read();
          const abortPromise = new Promise<never>((_, reject) => {
            idleController.signal.addEventListener("abort", () => reject(new ConflictError("AI generation stalled — no response from the provider.")), {
              once: true,
            });
          });
          const { done, value } = await Promise.race([readPromise, abortPromise]);
          if (done) break;
          resetIdleTimer();

          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.replace(/^data:\s*/, "").trim();
            if (!line || line === "[DONE]") continue;

            const chunk = JSON.parse(line) as OpenAiStreamChunk;
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              yield { type: "delta", text: delta };
            }
            if (chunk.usage) {
              usage = { promptTokens: chunk.usage.prompt_tokens, completionTokens: chunk.usage.completion_tokens, totalTokens: chunk.usage.total_tokens };
            }
          }
        }
      } finally {
        clearTimeout(idleTimer);
        reader.releaseLock();
      }

      yield { type: "done", result: { text: fullText.trim(), usage } };
    },
  };
}
