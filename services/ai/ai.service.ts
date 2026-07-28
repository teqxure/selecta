import "server-only";
import { resolveAiAdapter } from "@/services/ai/provider-resolver";
import type { GenerateTextInput, GenerateTextResult, GenerateTextStreamEvent } from "@/services/ai/types";

/**
 * The only module application/feature code ever imports to talk to an AI
 * provider. Nothing outside `services/ai/**` should import a specific
 * adapter, the resolver, or the integration-settings service directly —
 * every AI feature (product descriptions today; categorization,
 * assistants, image analysis, etc. later) calls a function here and
 * never knows or cares which provider is actually configured.
 *
 * `generateEmbedding`/`analyzeImage`/etc. get their own exported function
 * here the day a real feature needs them (same shape as `generateText`
 * below: resolve the adapter, call its optional method, throw a clear
 * error if the active adapter doesn't implement it) — not added
 * speculatively ahead of that.
 */

export interface GenerateTextServiceResult extends GenerateTextResult {
  /** Which provider/model actually served this call — for usage tracking and debugging, never for feature code to branch on. */
  provider: string;
  model: string;
}

export async function generateText(input: GenerateTextInput): Promise<GenerateTextServiceResult> {
  const adapter = await resolveAiAdapter();
  const result = await adapter.generateText(input);
  return { ...result, provider: adapter.provider, model: adapter.model };
}

export type GenerateTextStreamServiceEvent = GenerateTextStreamEvent & { provider: string; model: string };

/**
 * Same resolve-and-delegate shape as `generateText` above, for callers that
 * want token-by-token output (e.g. the Marketplace Assistant). If the
 * resolved adapter doesn't implement `generateTextStream` (no provider
 * wired up streaming yet), this degrades to one "delta" carrying the full
 * text followed by "done" — every current and future streaming caller gets
 * this fallback for free, without its own capability check.
 */
export async function* generateTextStream(input: GenerateTextInput): AsyncGenerator<GenerateTextStreamServiceEvent> {
  const adapter = await resolveAiAdapter();

  if (!adapter.generateTextStream) {
    const result = await adapter.generateText(input);
    yield { type: "delta", text: result.text, provider: adapter.provider, model: adapter.model };
    yield { type: "done", result, provider: adapter.provider, model: adapter.model };
    return;
  }

  for await (const event of adapter.generateTextStream(input)) {
    yield { ...event, provider: adapter.provider, model: adapter.model };
  }
}
