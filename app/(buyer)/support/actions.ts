"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/rbac";
import { createSupportTicket, addTicketMessage, getTicketForUser } from "@/services/support/ticket.service";
import { ROUTES } from "@/lib/constants/routes";
import { isAppError, ValidationError } from "@/lib/errors";

export interface CreateTicketActionState {
  error?: string;
}

export async function createSupportTicketAction(_prevState: CreateTicketActionState, formData: FormData): Promise<CreateTicketActionState> {
  const session = await requireAuth();

  const subject = String(formData.get("subject") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "").trim() || null;
  if (!subject || !description) return { error: "Fill in a subject and description" };

  let ticketId: string;
  try {
    const ticket = await createSupportTicket(session.userId, subject, category, description);
    ticketId = ticket.id;
  } catch (error) {
    if (isAppError(error)) return { error: error.message };
    throw error;
  }

  revalidatePath(ROUTES.support);
  redirect(ROUTES.supportTicket(ticketId));
}

export async function replyToSupportTicketAction(formData: FormData) {
  const session = await requireAuth();
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new ValidationError("Message can't be empty");

  await getTicketForUser(ticketId, session.userId); // throws ForbiddenError if this isn't the caller's own ticket
  await addTicketMessage(ticketId, session.userId, body);
  revalidatePath(ROUTES.supportTicket(ticketId));
}
