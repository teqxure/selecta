import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required").max(60),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only"),
  parentId: z.string().optional().or(z.literal("")),
  imageUrl: z.url().optional().or(z.literal("")),
});

export type CategoryInput = z.infer<typeof categorySchema>;
