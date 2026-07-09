import "server-only";
import { ConflictError } from "@/lib/errors";
import { getIntegrationSettingByProvider, getDecryptedSecret } from "@/services/platform/integration-settings.service";

const BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/**
 * Reuses the admin Integrations UI's existing "AI" category / "openai"
 * provider row for credential storage — no new admin surface, same
 * encrypted-at-rest pattern already used for Paystack/Flutterwave secret
 * keys. Model name is admin-configurable via `IntegrationSetting.config.model`
 * (falls back to a small, cheap model suited to short marketplace copy) so
 * it can change without a deploy.
 */
export async function completeChat(messages: ChatMessage[], maxTokens = 300): Promise<string> {
  const setting = await getIntegrationSettingByProvider("AI", "openai");
  if (!setting || !setting.isEnabled) {
    throw new ConflictError("The AI provider isn't configured yet — ask a Super Admin to enable OpenAI in Integrations.");
  }

  const apiKey = await getDecryptedSecret(setting.id, "API_KEY");
  const model = (setting.config as { model?: string } | null)?.model ?? DEFAULT_MODEL;

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });

  const json = (await response.json()) as {
    choices?: { message: { content: string } }[];
    error?: { message: string };
  };

  if (!response.ok || !json.choices?.[0]?.message?.content) {
    throw new ConflictError(`AI generation failed: ${json.error?.message ?? response.statusText}`);
  }

  return json.choices[0].message.content.trim();
}
