import "server-only";
import { ConflictError } from "@/lib/errors";
import { getPrimaryIntegration, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { ADAPTER_FACTORIES } from "@/services/ai/adapter-registry";
import type { AiAdapter, AiProviderConfig } from "@/services/ai/types";

/**
 * Turns "whichever AI provider Selecta HQ has marked primary" into a
 * ready-to-use adapter instance. This is the only place that reads
 * `IntegrationSetting`/`IntegrationSecret` for AI — no adapter, and no
 * feature file, ever queries the database or decrypts a secret directly.
 *
 * Replaces the old `getIntegrationSettingByProvider("AI", "openai")`
 * hardcode: the provider name is read from the database, never written
 * as a literal here. Reusing `getPrimaryIntegration` (already built and
 * already used the same way by the payment/notification providers) means
 * the "Make primary" toggle in /admin/integrations, which was previously
 * inert for the AI category, now actually does something.
 */
export async function resolveAiAdapter(): Promise<AiAdapter> {
  const setting = await getPrimaryIntegration("AI");
  if (!setting || !setting.isEnabled) {
    throw new ConflictError("The AI provider isn't configured yet — ask a Super Admin to enable and mark one primary in Integrations.");
  }

  const factory = ADAPTER_FACTORIES[setting.provider];
  if (!factory) {
    throw new ConflictError(
      `"${setting.provider}" is stored as the primary AI provider, but no adapter is registered for it yet.`,
    );
  }

  const apiKey = await getDecryptedSecret(setting.id, "API_KEY");
  const config = (setting.config as AiProviderConfig | null) ?? {};

  return factory(apiKey, config);
}
