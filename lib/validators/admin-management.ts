import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/validators/common";
import { ADMIN_PERMISSIONS } from "@/lib/constants/permissions";

export const createAdminSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: emailSchema,
  password: passwordSchema,
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).default([]),
});

export const updateAdminPermissionsSchema = z.object({
  permissions: z.array(z.enum(ADMIN_PERMISSIONS)).default([]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminPermissionsInput = z.infer<typeof updateAdminPermissionsSchema>;
