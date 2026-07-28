import Link from "next/link";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getAiAssistantSettings, readSuggestedPrompts } from "@/services/platform/ai-assistant-settings.service";
import { getPrimaryIntegration } from "@/services/platform/integration-settings.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants/routes";
import { updateAiAssistantSettingsAction } from "./actions";

export default async function AdminAiAssistantPage() {
  await requireRole(Role.SUPER_ADMIN);
  const [settings, aiIntegration] = await Promise.all([getAiAssistantSettings(), getPrimaryIntegration("AI")]);
  const suggestedPrompts = readSuggestedPrompts(settings.suggestedPrompts);
  const model = (aiIntegration?.config as { model?: string } | null)?.model;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">AI Marketplace Assistant</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>
            Provider and model are shared platform-wide (with AI Product Writer) — manage them in{" "}
            <Link href={ROUTES.admin.integrations} className="underline">
              Integrations
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {aiIntegration ? (
            <>
              <Badge tone={aiIntegration.isEnabled ? "success" : "neutral"}>{aiIntegration.provider}</Badge>
              <span className="text-sm text-muted-foreground">{model ?? "using adapter default model"}</span>
            </>
          ) : (
            <Badge tone="warning">No AI provider configured yet</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assistant settings</CardTitle>
          <CardDescription>Changes take effect immediately for every buyer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAiAssistantSettingsAction} className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="isEnabled"
                  defaultChecked={settings.isEnabled}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
                />
                <span>
                  <span className="font-medium text-foreground">Enabled</span>
                  <span className="block text-xs text-muted-foreground">
                    When off, the assistant is removed entirely — no floating button, no client-side code, no requests.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="isFloatingButtonEnabled"
                  defaultChecked={settings.isFloatingButtonEnabled}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
                />
                <span className="font-medium text-foreground">Floating button enabled</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="streamingEnabled"
                  defaultChecked={settings.streamingEnabled}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]"
                />
                <span>
                  <span className="font-medium text-foreground">Streaming enabled</span>
                  <span className="block text-xs text-muted-foreground">
                    Responses appear token-by-token. Turning this off waits for the full reply before showing it.
                  </span>
                </span>
              </label>
            </div>

            <Input name="welcomeMessage" label="Welcome message" defaultValue={settings.welcomeMessage} required />
            <Input name="placeholderText" label="Placeholder text" defaultValue={settings.placeholderText} required />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="suggestedPrompts" className="text-sm font-medium text-foreground">
                Suggested prompts
              </label>
              <textarea
                id="suggestedPrompts"
                name="suggestedPrompts"
                rows={5}
                defaultValue={suggestedPrompts.join("\n")}
                placeholder="One prompt per line"
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-1 focus:ring-offset-background"
              />
              <p className="text-xs text-muted-foreground">One per line — shown as tappable quick actions on the welcome screen.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="maxConversationLength"
                type="number"
                min={1}
                label="Maximum conversation length"
                helperText="Messages before a conversation must be restarted."
                defaultValue={settings.maxConversationLength}
                required
              />
              <Input
                name="temperature"
                type="number"
                min={0}
                max={2}
                step="0.1"
                label="Temperature"
                helperText="Higher is more creative, lower is more focused."
                defaultValue={settings.temperature}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="systemPrompt" className="text-sm font-medium text-foreground">
                System prompt
              </label>
              <textarea
                id="systemPrompt"
                name="systemPrompt"
                rows={6}
                defaultValue={settings.systemPrompt}
                required
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-1 focus:ring-offset-background"
              />
              <p className="text-xs text-muted-foreground">
                The assistant&rsquo;s persona and rules. Current marketplace context and matching inventory are appended automatically at request time.
              </p>
            </div>

            <Button type="submit" variant="accent" className="self-start">
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
