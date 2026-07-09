import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplateDefault } from "@/lib/notifications/default-templates";

export interface ResolvedEmailTemplate {
  key: string;
  label: string;
  subject: string;
  bodyHtml: string;
  isEnabled: boolean;
  /** False until a Super Admin has actually saved an override — still fully usable, just running on the built-in copy. */
  isCustomized: boolean;
}

function fromDefault(key: string, def: EmailTemplateDefault): ResolvedEmailTemplate {
  return { key, label: def.label, subject: def.subject, bodyHtml: def.bodyHtml, isEnabled: true, isCustomized: false };
}

/** The template actually used at send time — a Super-Admin-edited DB row if one exists, else the built-in default. Unknown keys return null (a code bug, not a config gap). */
export async function getEmailTemplate(key: string): Promise<ResolvedEmailTemplate | null> {
  const stored = await db.emailTemplate.findUnique({ where: { key } });
  if (stored) {
    return { key: stored.key, label: stored.label, subject: stored.subject, bodyHtml: stored.bodyHtml, isEnabled: stored.isEnabled, isCustomized: true };
  }

  const fallback = DEFAULT_EMAIL_TEMPLATES[key];
  return fallback ? fromDefault(key, fallback) : null;
}

/** Every known template key, DB overrides merged over the built-in defaults — what the Super Admin template list shows. */
export async function listEmailTemplates(): Promise<ResolvedEmailTemplate[]> {
  const stored = await db.emailTemplate.findMany();
  const storedByKey = new Map(stored.map((row) => [row.key, row]));

  return Object.entries(DEFAULT_EMAIL_TEMPLATES).map(([key, def]) => {
    const row = storedByKey.get(key);
    if (!row) return fromDefault(key, def);
    return { key: row.key, label: row.label, subject: row.subject, bodyHtml: row.bodyHtml, isEnabled: row.isEnabled, isCustomized: true };
  });
}

export interface UpdateEmailTemplateInput {
  subject: string;
  bodyHtml: string;
  isEnabled: boolean;
}

export async function updateEmailTemplate(adminId: string, key: string, input: UpdateEmailTemplateInput) {
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  if (!def) throw new Error(`Unknown email template key: ${key}`);

  return db.$transaction(async (tx) => {
    const template = await tx.emailTemplate.upsert({
      where: { key },
      update: { subject: input.subject, bodyHtml: input.bodyHtml, isEnabled: input.isEnabled, updatedById: adminId },
      create: { key, label: def.label, subject: input.subject, bodyHtml: input.bodyHtml, isEnabled: input.isEnabled, updatedById: adminId },
    });

    await tx.auditLog.create({
      data: { actorId: adminId, action: "EMAIL_TEMPLATE_UPDATED", entityType: "EmailTemplate", entityId: key },
    });

    return template;
  });
}

/** Resets a template back to its built-in default by deleting the override row — a no-op if it was never customized. */
export async function resetEmailTemplate(adminId: string, key: string) {
  await db.emailTemplate.deleteMany({ where: { key } });
  await db.auditLog.create({
    data: { actorId: adminId, action: "EMAIL_TEMPLATE_RESET", entityType: "EmailTemplate", entityId: key },
  });
}
