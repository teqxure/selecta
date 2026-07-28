import "server-only";
import { createOpenAiAdapter } from "@/services/ai/adapters/openai.adapter";
import type { AiAdapterFactory } from "@/services/ai/types";

/**
 * The one file a new provider touches beyond its own adapter file. Key
 * must match `IntegrationSetting.provider` / `ProviderSpec.value` in
 * `lib/constants/integration-providers.ts` exactly — the resolver looks
 * up this map by that string, nothing here is ever branched on by name
 * anywhere else in the app.
 *
 * Only providers with a real, working adapter belong here. A provider
 * can exist in the admin Integrations catalog (`notYetWired: true`)
 * without an entry here — the resolver's "no adapter registered" error
 * is exactly how that distinction surfaces at runtime, rather than
 * silently pretending an unwired provider works.
 */
export const ADAPTER_FACTORIES: Record<string, AiAdapterFactory> = {
  openai: createOpenAiAdapter,
};
