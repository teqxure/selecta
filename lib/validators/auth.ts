import { z } from "zod";
import { emailSchema, nigerianPhoneSchema, passwordSchema } from "@/lib/validators/common";

/** Checkbox inputs arrive as "on" or are absent from FormData — never "true"/"false". */
const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());

/** Public self-registration only ever creates a BUYER or SELLER account. */
export const PUBLIC_REGISTER_ROLES = ["BUYER", "SELLER"] as const;

export const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50),
    lastName: z.string().min(1, "Last name is required").max(50),
    email: emailSchema,
    phone: nigerianPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: z.enum(PUBLIC_REGISTER_ROLES).default("BUYER"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(72, "Password must be at most 72 characters"),
  rememberMe: checkboxSchema.optional().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
