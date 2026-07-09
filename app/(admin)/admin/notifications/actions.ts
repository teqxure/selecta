"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { updateSystemSettings } from "@/services/platform/system-settings.service";
import { updateEmailTemplate, resetEmailTemplate } from "@/services/notifications/email-template.service";
import { ROUTES } from "@/lib/constants/routes";

export async function updateNotificationSenderAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);

  await updateSystemSettings(session.userId, {
    notificationSenderName: String(formData.get("notificationSenderName") || "Selecta"),
    notificationSenderEmail: String(formData.get("notificationSenderEmail") || "") || null,
  });

  revalidatePath(ROUTES.admin.notifications);
}

export async function updateEmailTemplateAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const key = String(formData.get("key"));

  await updateEmailTemplate(session.userId, key, {
    subject: String(formData.get("subject") || ""),
    bodyHtml: String(formData.get("bodyHtml") || ""),
    isEnabled: formData.get("isEnabled") === "on",
  });

  revalidatePath(ROUTES.admin.notifications);
}

export async function resetEmailTemplateAction(formData: FormData) {
  const session = await requireRole(Role.SUPER_ADMIN);
  const key = String(formData.get("key"));

  await resetEmailTemplate(session.userId, key);

  revalidatePath(ROUTES.admin.notifications);
}
