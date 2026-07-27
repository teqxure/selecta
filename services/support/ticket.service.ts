import "server-only";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sanitizeText } from "@/lib/security/sanitize";
import { createNotification } from "@/services/notifications/notification.service";
import type { SupportTicketStatus, SupportTicketPriority } from "@/generated/prisma/enums";

export async function createSupportTicket(userId: string, subject: string, category: string | null, description: string) {
  const ticket = await db.supportTicket.create({
    data: { userId, subject: sanitizeText(subject), category, description: sanitizeText(description) },
  });
  await db.auditLog.create({ data: { actorId: userId, action: "SUPPORT_TICKET_CREATED", entityType: "SupportTicket", entityId: ticket.id } });
  return ticket;
}

const TICKET_INCLUDE = {
  user: true,
  assignedTo: true,
  messages: { include: { sender: true }, orderBy: { createdAt: "asc" as const } },
} as const;

export function listTicketsForUser(userId: string) {
  return db.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function getTicketForUser(ticketId: string, userId: string) {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
  if (!ticket) throw new NotFoundError("Support ticket");
  if (ticket.userId !== userId) throw new ForbiddenError("This isn't your ticket");
  return ticket;
}

export async function getTicketForAdmin(ticketId: string) {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId }, include: TICKET_INCLUDE });
  if (!ticket) throw new NotFoundError("Support ticket");
  return ticket;
}

export function listTicketQueue(status?: SupportTicketStatus) {
  return db.supportTicket.findMany({
    where: status ? { status } : {},
    include: { user: true, assignedTo: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

/** Buyer or staff reply. A buyer reply on a RESOLVED ticket reopens it — CLOSED is terminal and only staff can reopen (via setTicketStatus). */
export async function addTicketMessage(ticketId: string, senderId: string, body: string) {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError("Support ticket");
  if (ticket.status === "CLOSED") throw new ValidationError("This ticket is closed");

  return db.$transaction(async (tx) => {
    const message = await tx.supportTicketMessage.create({ data: { ticketId, senderId, body: sanitizeText(body) } });

    const isBuyerReply = senderId === ticket.userId;
    if (isBuyerReply && ticket.status === "RESOLVED") {
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "OPEN" } });
    } else if (!isBuyerReply && ticket.status === "OPEN") {
      await tx.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS" } });
    }

    if (isBuyerReply && ticket.assignedToId) {
      await createNotification(ticket.assignedToId, "SYSTEM", "New reply on a support ticket", `A buyer replied to "${ticket.subject}".`);
    } else if (!isBuyerReply) {
      await createNotification(ticket.userId, "SYSTEM", "New reply on your support ticket", `Selecta support replied to "${ticket.subject}".`);
    }

    return message;
  });
}

export async function assignTicket(adminId: string, ticketId: string, assignedToId: string | null) {
  return db.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.update({ where: { id: ticketId }, data: { assignedToId } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "SUPPORT_TICKET_ASSIGNED", entityType: "SupportTicket", entityId: ticketId, metadata: { assignedToId } },
    });
    return ticket;
  });
}

export async function setTicketStatus(adminId: string, ticketId: string, status: SupportTicketStatus) {
  return db.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.update({ where: { id: ticketId }, data: { status } });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "SUPPORT_TICKET_STATUS_CHANGED", entityType: "SupportTicket", entityId: ticketId, metadata: { status } },
    });
    return ticket;
  });
}

/** Escalation is just priority=URGENT + escalatedAt set — not a separate entity. */
export async function setTicketPriority(adminId: string, ticketId: string, priority: SupportTicketPriority) {
  return db.$transaction(async (tx) => {
    const ticket = await tx.supportTicket.update({
      where: { id: ticketId },
      data: { priority, escalatedAt: priority === "URGENT" ? new Date() : undefined },
    });
    await tx.auditLog.create({
      data: { actorId: adminId, action: "SUPPORT_TICKET_PRIORITY_CHANGED", entityType: "SupportTicket", entityId: ticketId, metadata: { priority } },
    });
    return ticket;
  });
}
