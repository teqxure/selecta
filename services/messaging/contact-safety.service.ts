import "server-only";
import { db } from "@/lib/db";
import type { MessageFlagType } from "@/generated/prisma/enums";

export interface ContactSafetyMatch {
  flagType: MessageFlagType;
  /** A short, already-redacted excerpt — never the raw phone/email/account itself. Safe to store and show to an admin reviewer. */
  matchedSnippet: string;
}

const PHONE_PATTERN = /(?:\+?234|0)[\s.-]?[7-9]\d(?:[\s.-]?\d){8}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const WHATSAPP_PATTERN = /\bwhat'?s\s?app\b|\bwa\.me\b|\bw\/?a\b(?=.{0,15}(number|chat|me))/i;
const BANK_ACCOUNT_PATTERN = /\b(account\s?(number|no\.?)|acct\s?no\.?|sort\s?code|nuban)\b/i;
const EXTERNAL_PAYMENT_PATTERN = /\b(send\s?money|bank\s?transfer|transfer\s?(the\s?money|it|to\s?my)|pay\s?(me\s?)?directly|cash\s?app|zelle|western\s?union|pay\s?outside|off[\s-]?platform)\b/i;
const SOCIAL_HANDLE_PATTERN = /\b(instagram|ig\s?:|tiktok|snapchat|telegram)\b|(?<![\w@.])@[a-zA-Z0-9_.]{3,}\b/i;

function maskPhone(match: string) {
  const digits = match.replace(/\D/g, "");
  if (digits.length < 6) return "•".repeat(digits.length);
  return `${digits.slice(0, 3)}${"•".repeat(digits.length - 5)}${digits.slice(-2)}`;
}

function maskEmail(match: string) {
  const [local, domain] = match.split("@");
  const maskedLocal = local.length <= 2 ? "•".repeat(local.length) : `${local[0]}${"•".repeat(local.length - 2)}${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
}

function excerpt(body: string, match: RegExpMatchArray) {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 15);
  const end = Math.min(body.length, index + match[0].length + 15);
  return `${start > 0 ? "…" : ""}${body.slice(start, end)}${end < body.length ? "…" : ""}`;
}

/**
 * Checked from `sendMessage` before persisting — never blocks the send
 * (Phase 15: "do not block legitimate communication"), just returns what
 * to flag. Priority order below picks the single most specific signal when
 * a message matches more than one pattern (schema stores one flag/message).
 * Regex + digit-normalization, not a full NLP classifier — deliberately
 * simple pattern matching per the brief, layered with the warning/risk
 * system rather than relied on alone (Phase 15: "do not rely only on
 * keyword blocking").
 */
export function detectContactSharingAttempt(body: string): ContactSafetyMatch | null {
  const whatsappMatch = body.match(WHATSAPP_PATTERN);
  if (whatsappMatch) return { flagType: "WHATSAPP", matchedSnippet: excerpt(body, whatsappMatch) };

  const phoneMatch = body.match(PHONE_PATTERN);
  if (phoneMatch) return { flagType: "PHONE_NUMBER", matchedSnippet: maskPhone(phoneMatch[0]) };

  const emailMatch = body.match(EMAIL_PATTERN);
  if (emailMatch) return { flagType: "EMAIL_ADDRESS", matchedSnippet: maskEmail(emailMatch[0]) };

  const bankMatch = body.match(BANK_ACCOUNT_PATTERN);
  if (bankMatch) return { flagType: "BANK_ACCOUNT", matchedSnippet: excerpt(body, bankMatch) };

  const paymentMatch = body.match(EXTERNAL_PAYMENT_PATTERN);
  if (paymentMatch) return { flagType: "EXTERNAL_PAYMENT", matchedSnippet: excerpt(body, paymentMatch) };

  const socialMatch = body.match(SOCIAL_HANDLE_PATTERN);
  if (socialMatch) return { flagType: "SOCIAL_HANDLE", matchedSnippet: excerpt(body, socialMatch) };

  return null;
}

export const CONTACT_SAFETY_WARNING = "For your safety, keep conversations and payments on Selecta.";

/** How many contact-sharing attempts this user has triggered recently — the single source both the trust-score penalty and the admin review queue read from. */
export function getViolationCount(userId: string, days = 90) {
  const since = new Date(Date.now() - days * 86_400_000);
  return db.messageFlag.count({ where: { userId, createdAt: { gte: since } } });
}

/**
 * 0-15 point deduction applied to Store Health — a single flagged message
 * costs nothing (Phase 5: "do not immediately punish first attempts"),
 * only a genuine pattern of repeated attempts does.
 */
export function getTrustPenalty(violationCount: number): number {
  if (violationCount === 0) return 0;
  if (violationCount === 1) return 2;
  if (violationCount === 2) return 5;
  if (violationCount === 3) return 10;
  return 15;
}

export interface FlaggedUserRow {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  violationCount: number;
}

/** Users with enough recent violations to warrant Super Admin attention — the Phase-11 trust dashboard's queue. */
export async function getUsersFlaggedForReview(minViolations = 3, days = 90): Promise<FlaggedUserRow[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.messageFlag.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _count: true,
    having: { userId: { _count: { gte: minViolations } } },
    orderBy: { _count: { userId: "desc" } },
  });
  if (rows.length === 0) return [];

  const users = await db.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, email: true, firstName: true, lastName: true } });
  const byId = new Map(users.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const user = byId.get(row.userId);
      if (!user) return null;
      return { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, violationCount: row._count };
    })
    .filter((r): r is FlaggedUserRow => r !== null);
}
