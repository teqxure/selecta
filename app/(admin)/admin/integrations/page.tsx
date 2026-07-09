import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { listIntegrationSettings } from "@/services/platform/integration-settings.service";
import { findProviderSpec } from "@/lib/constants/integration-providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plug } from "lucide-react";
import {
  upsertIntegrationSettingAction,
  setIntegrationSecretAction,
  setIntegrationSecretsAction,
  deleteIntegrationSecretAction,
} from "./actions";
import { AddProviderForm } from "./add-provider-form";

export default async function AdminIntegrationsPage() {
  await requireRole(Role.SUPER_ADMIN);
  const integrations = await listIntegrationSettings();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecta HQ</p>
        <h1 className="font-display text-2xl font-semibold text-foreground">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider credentials are encrypted at rest and never shown in full — only the last 4 characters are displayed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured providers</CardTitle>
          <CardDescription>Only one provider per category can be marked primary — that&apos;s the one live traffic uses.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {integrations.length === 0 && (
            <EmptyState icon={Plug} title="No integrations configured" description="Add a provider below to get started." />
          )}
          {integrations.map((integration) => {
            const spec = findProviderSpec(integration.category, integration.provider);
            const secretsByKey = new Map(integration.secrets.map((secret) => [secret.key, secret]));

            return (
              <div key={integration.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{spec?.label ?? integration.provider}</span>
                    <Badge tone="neutral">{integration.category}</Badge>
                    <Badge tone={integration.isEnabled ? "success" : "neutral"}>
                      {integration.isEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {integration.isPrimary && <Badge tone="accent">Primary</Badge>}
                    {spec?.notYetWired && <Badge tone="warning">Stored only — not yet live</Badge>}
                  </div>
                  <form action={upsertIntegrationSettingAction} className="flex items-center gap-2">
                    <input type="hidden" name="category" value={integration.category} />
                    <input type="hidden" name="provider" value={integration.provider} />
                    {!integration.isEnabled && <input type="hidden" name="isEnabled" value="on" />}
                    <input type="hidden" name="isPrimary" value={integration.isPrimary ? "on" : ""} />
                    <Button type="submit" size="sm" variant={integration.isEnabled ? "outline" : "secondary"}>
                      {integration.isEnabled ? "Disable" : "Enable"}
                    </Button>
                  </form>
                  {integration.isEnabled && !integration.isPrimary && (
                    <form action={upsertIntegrationSettingAction}>
                      <input type="hidden" name="category" value={integration.category} />
                      <input type="hidden" name="provider" value={integration.provider} />
                      <input type="hidden" name="isEnabled" value="on" />
                      <input type="hidden" name="isPrimary" value="on" />
                      <Button type="submit" size="sm" variant="accent">
                        Make primary
                      </Button>
                    </form>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {spec ? (
                    <form action={setIntegrationSecretsAction} className="flex flex-col gap-3">
                      <input type="hidden" name="integrationSettingId" value={integration.id} />
                      <input type="hidden" name="category" value={integration.category} />
                      <input type="hidden" name="provider" value={integration.provider} />
                      {spec.fields.map((field) => {
                        const existing = secretsByKey.get(field.key);
                        return (
                          <PasswordInput
                            key={field.key}
                            name={field.key}
                            label={field.label}
                            placeholder={existing ? `********************${existing.lastFourDisplay}` : field.placeholder}
                            helperText={field.helperText}
                          />
                        );
                      })}
                      <Button type="submit" size="sm" variant="secondary" className="self-start">
                        Save credentials
                      </Button>
                    </form>
                  ) : (
                    <>
                      {integration.secrets.map((secret) => (
                        <div key={secret.id} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">
                            {secret.key}: ********************{secret.lastFourDisplay}
                          </span>
                          <form action={deleteIntegrationSecretAction}>
                            <input type="hidden" name="id" value={secret.id} />
                            <Button type="submit" size="sm" variant="ghost">
                              Remove
                            </Button>
                          </form>
                        </div>
                      ))}

                      <form action={setIntegrationSecretAction} className="flex items-end gap-2 pt-1">
                        <input type="hidden" name="integrationSettingId" value={integration.id} />
                        <Input name="key" placeholder="SECRET_KEY" className="h-9 flex-1" />
                        <PasswordInput name="value" placeholder="Value" className="h-9 flex-1" />
                        <Button type="submit" size="sm" variant="secondary">
                          Save secret
                        </Button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add provider</CardTitle>
          <CardDescription>Choosing a known provider shows exactly the credential fields it needs.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddProviderForm />
        </CardContent>
      </Card>
    </div>
  );
}
