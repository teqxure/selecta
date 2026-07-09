import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getPrimaryIntegration, getDecryptedSecret } from "@/services/platform/integration-settings.service";
import { getSystemSettings } from "@/services/platform/system-settings.service";
import { getEmailTemplate } from "@/services/notifications/email-template.service";
import { renderTemplate, wrapEmailLayout } from "@/lib/notifications/template";
import { logger } from "@/lib/logger";

function fallbackSenderEmail(): string {
  try {
    const hostname = new URL(env.NEXT_PUBLIC_APP_URL).hostname.replace(/^www\./, "");
    return `notifications@${hostname}`;
  } catch {
    return "notifications@selectapick.store";
  }
}

interface SendResult {
  ok: boolean;
  deliveryId: string;
}

/**
 * The only function in the codebase allowed to call an email provider's
 * API. Never throws — a missing/misconfigured provider, an unknown
 * template, or a provider-side failure all resolve to a recorded FAILED
 * `NotificationDelivery` row instead of an unhandled exception, so a
 * broken inbox never takes an order/dispute/withdrawal flow down with it.
 */
export async function sendEmail(to: string, subject: string, html: string, options: { userId?: string; templateKey?: string } = {}): Promise<SendResult> {
  const delivery = await db.notificationDelivery.create({
    data: { userId: options.userId, channel: "EMAIL", recipient: to, templateKey: options.templateKey, status: "PENDING" },
  });

  const markFailed = async (reason: string) => {
    await db.notificationDelivery.update({ where: { id: delivery.id }, data: { status: "FAILED", failureReason: reason.slice(0, 500) } });
    logger.warn("Email send failed", { deliveryId: delivery.id, reason });
    return { ok: false, deliveryId: delivery.id };
  };

  try {
    const setting = await getPrimaryIntegration("EMAIL");
    if (!setting) return await markFailed("No email provider is configured or enabled");

    const apiKey = await getDecryptedSecret(setting.id, "API_KEY").catch(() => null);
    if (!apiKey) return await markFailed(`No API key stored for ${setting.provider}`);

    if (setting.provider !== "resend") {
      return await markFailed(`Email provider "${setting.provider}" isn't wired yet — only Resend is implemented`);
    }

    const settings = await getSystemSettings();
    const senderEmail = settings.notificationSenderEmail || fallbackSenderEmail();
    const from = `${settings.notificationSenderName} <${senderEmail}>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!response.ok) {
      return await markFailed(`Resend responded ${response.status}: ${await response.text()}`);
    }

    await db.notificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", provider: setting.provider, sentAt: new Date() },
    });
    return { ok: true, deliveryId: delivery.id };
  } catch (error) {
    return await markFailed(error instanceof Error ? error.message : String(error));
  }
}

/** Resolves a template by key, substitutes `{{variables}}`, wraps it in the shared layout, and sends it — the path every notification event goes through for email. */
export async function sendTemplatedEmail(
  to: string,
  templateKey: string,
  variables: Record<string, string>,
  options: { userId?: string } = {},
): Promise<SendResult> {
  const template = await getEmailTemplate(templateKey);
  if (!template) {
    const delivery = await db.notificationDelivery.create({
      data: { userId: options.userId, channel: "EMAIL", recipient: to, templateKey, status: "FAILED", failureReason: `Unknown template key: ${templateKey}` },
    });
    return { ok: false, deliveryId: delivery.id };
  }
  if (!template.isEnabled) {
    const delivery = await db.notificationDelivery.create({
      data: { userId: options.userId, channel: "EMAIL", recipient: to, templateKey, status: "FAILED", failureReason: "Template is disabled" },
    });
    return { ok: false, deliveryId: delivery.id };
  }

  const subject = renderTemplate(template.subject, variables);
  const bodyHtml = renderTemplate(template.bodyHtml, variables);
  const html = wrapEmailLayout(bodyHtml, { previewText: subject });

  return sendEmail(to, subject, html, { userId: options.userId, templateKey });
}

export interface DeliveryHealthSummary {
  sent: number;
  failed: number;
  pending: number;
  recentFailures: { id: string; recipient: string; templateKey: string | null; failureReason: string | null; createdAt: Date }[];
}

/** Last 200 delivery attempts, summarized — enough to see if the channel is healthy without paging through everything. */
export async function getDeliveryHealthSummary(): Promise<DeliveryHealthSummary> {
  const recent = await db.notificationDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, status: true, recipient: true, templateKey: true, failureReason: true, createdAt: true },
  });

  return {
    sent: recent.filter((d) => d.status === "SENT").length,
    failed: recent.filter((d) => d.status === "FAILED").length,
    pending: recent.filter((d) => d.status === "PENDING").length,
    recentFailures: recent.filter((d) => d.status === "FAILED").slice(0, 10),
  };
}
