import { currentUser } from "@/lib/auth/current-user";
import { getAiAssistantSettings, readSuggestedPrompts } from "@/services/platform/ai-assistant-settings.service";
import { isFeatureEnabled } from "@/services/platform/feature-flags.service";
import { AI_KILL_SWITCH_KEY } from "@/services/monetization/entitlement.service";
import { AssistantWidgetClient } from "./AssistantWidgetClient";

/**
 * Disabled means genuinely nothing rendered — not hidden via CSS. When
 * either the assistant's own toggle or the platform-wide AI kill switch
 * says no, this returns null and AssistantWidgetClient (and its JS bundle,
 * and every /api/assistant/chat request it could ever make) simply never
 * mounts. `currentUser()` is React `cache()`-wrapped, so calling it here
 * costs nothing extra beyond what the layout/Navbar already fetch.
 */
export async function AiAssistantWidget() {
  const [settings, killSwitchEnabled, user] = await Promise.all([
    getAiAssistantSettings(),
    isFeatureEnabled(AI_KILL_SWITCH_KEY),
    currentUser(),
  ]);

  if (!settings.isEnabled || killSwitchEnabled) return null;

  return (
    <AssistantWidgetClient
      isAuthenticated={!!user}
      isFloatingButtonEnabled={settings.isFloatingButtonEnabled}
      welcomeMessage={settings.welcomeMessage}
      placeholderText={settings.placeholderText}
      suggestedPrompts={readSuggestedPrompts(settings.suggestedPrompts)}
    />
  );
}
