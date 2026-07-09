import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSystemSettings } from "@/services/platform/system-settings.service";
import { listEmailTemplates } from "@/services/notifications/email-template.service";
import { getDeliveryHealthSummary } from "@/services/notifications/email.service";
import { getPrimaryIntegration } from "@/services/platform/integration-settings.service";
import { ROUTES } from "@/lib/constants/routes";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/dashboard/StatCard";
import { Mail, MailWarning, MailCheck, Clock } from "lucide-react";
import { updateNotificationSenderAction, updateEmailTemplateAction, resetEmailTemplateAction } from "./actions";

export default async function AdminNotificationsPage() {
  await requireRole(Role.SUPER_ADMIN);

  const [settings, templates, health, emailIntegration] = await Promise.all([
    getSystemSettings(),
    listEmailTemplates(),
    getDeliveryHealthSummary(),
    getPrimaryIntegration("EMAIL"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: ROUTES.admin.root }, { label: "Notifications" }]}
        title="Notifications & email"
        description="Sender identity, delivery health, and the templates every event sends."
      />

      {!emailIntegration && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            No email provider is enabled as primary yet — configure one at{" "}
            <a href={ROUTES.admin.integrations} className="font-medium underline">
              Integrations
            </a>
            . Until then, every send below will be recorded as failed.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sent (last 200)" icon={MailCheck} value={String(health.sent)} />
        <StatCard label="Failed (last 200)" icon={MailWarning} value={String(health.failed)} />
        <StatCard label="Pending" icon={Clock} value={String(health.pending)} />
        <StatCard label="Provider" icon={Mail} value={emailIntegration?.provider ?? "None"} />
      </div>

      {health.recentFailures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent failures</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {health.recentFailures.map((failure) => (
              <div key={failure.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-secondary-foreground">
                    {failure.recipient} · {failure.templateKey ?? "unknown template"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{failure.failureReason}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{failure.createdAt.toLocaleString("en-NG")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sender identity</CardTitle>
          <CardDescription>The &quot;From&quot; name and address every templated email is sent with.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateNotificationSenderAction} className="flex flex-wrap items-end gap-3">
            <Input name="notificationSenderName" label="Sender name" defaultValue={settings.notificationSenderName} className="w-56" />
            <Input
              name="notificationSenderEmail"
              type="email"
              label="Sender email"
              defaultValue={settings.notificationSenderEmail ?? ""}
              placeholder="notifications@selectapick.store"
              className="w-72"
            />
            <Button type="submit" variant="accent" size="sm">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg font-semibold text-foreground">Email templates</h2>
        <div className="flex flex-col gap-4">
          {templates.map((template) => (
            <Card key={template.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{template.label}</CardTitle>
                    <CardDescription>Key: {template.key}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {template.isCustomized && <Badge tone="accent">Customized</Badge>}
                    <Badge tone={template.isEnabled ? "success" : "neutral"}>{template.isEnabled ? "Enabled" : "Disabled"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <form action={updateEmailTemplateAction} className="flex flex-col gap-3">
                  <input type="hidden" name="key" value={template.key} />
                  <Input name="subject" label="Subject" defaultValue={template.subject} />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`body-${template.key}`} className="text-sm font-medium text-foreground">
                      Body (HTML)
                    </label>
                    <textarea
                      id={`body-${template.key}`}
                      name="bodyHtml"
                      defaultValue={template.bodyHtml}
                      rows={4}
                      className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-1 focus:ring-offset-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{{customerName}}"}, {"{{orderId}}"}, {"{{amount}}"}, {"{{storeName}}"}, {"{{status}}"}, {"{{message}}"} — unused ones are ignored.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" name="isEnabled" defaultChecked={template.isEnabled} className="h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]" />
                    Enabled
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" variant="accent">
                      Save
                    </Button>
                  </div>
                </form>
                {template.isCustomized && (
                  <form action={resetEmailTemplateAction} className="self-start">
                    <input type="hidden" name="key" value={template.key} />
                    <Button type="submit" size="sm" variant="ghost">
                      Reset to default
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
