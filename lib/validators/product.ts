import { z } from "zod";
import { moneySchema } from "@/lib/validators/common";

export const createProductSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional(),
  price: moneySchema,
  quantity: z.number().int().min(1).default(1),
  images: z.array(z.url()).min(1, "At least one image is required").max(10),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
