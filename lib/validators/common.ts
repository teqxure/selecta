import { z } from "zod";

/**
 * Shared primitives. Compose these in feature-specific schemas rather than
 * re-declaring `z.string().email()` etc. all over the codebase — one place
 * to tighten a rule (e.g. password length) later.
 */
export const emailSchema = z.email();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters"); // bcrypt truncates beyond 72 bytes

export const nigerianPhoneSchema = z
  .string()
  .regex(/^(\+234|0)[789][01]\d{8}$/, "Enter a valid Nigerian phone number");

export const moneySchema = z
  .number()
  .nonnegative()
  .multipleOf(0.01, "Amount can have at most 2 decimal places");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

export type Pagination = z.infer<typeof paginationSchema>;
