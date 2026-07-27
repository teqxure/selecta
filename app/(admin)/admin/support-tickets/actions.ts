"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/rbac";
import { addTicketMessage, assignTicket, setTicketStatus, setTicketPriority } from "@/services/support/ticket.service";
import { ROUTES } from "@/lib/constants/routes";
import type { SupportTicketStatus, SupportTicketPriority } from "@/generated/prisma/enums";

export async function replyToTicketAction(formData: FormData) {
  const session = await requirePermission("support.messages");
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await addTicketMessage(ticketId, session.id, body);
  revalidatePath(ROUTES.admin.supportTicket(ticketId));
}

export async function assignTicketAction(formData: FormData) {
  const session = await requirePermission("support.messages");
  const ticketId = String(formData.get("ticketId"));
  const assignedToId = String(formData.get("assignedToId") || "") || null;

  await assignTicket(session.id, ticketId, assignedToId);
  revalidatePath(ROUTES.admin.supportTicket(ticketId));
  revalidatePath(ROUTES.admin.supportTickets);
}

export async function setTicketStatusAction(formData: FormData) {
  const session = await requirePermission("support.messages");
  const ticketId = String(formData.get("ticketId"));
  const status = String(formData.get("status")) as SupportTicketStatus;

  await setTicketStatus(session.id, ticketId, status);
  revalidatePath(ROUTES.admin.supportTicket(ticketId));
  revalidatePath(ROUTES.admin.supportTickets);
}

export async function setTicketPriorityAction(formData: FormData) {
  const session = await requirePermission("support.messages");
  const ticketId = String(formData.get("ticketId"));
  const priority = String(formData.get("priority")) as SupportTicketPriority;

  await setTicketPriority(session.id, ticketId, priority);
  revalidatePath(ROUTES.admin.supportTicket(ticketId));
}
