import { z } from "zod";
import { moneySchema } from "@/lib/validators/common";
import {
  ConditionGrade,
  ProductGender,
  ProductImageKind,
} from "@/generated/prisma/enums";

// Display copy only — the underlying enum value stays SELECTA_GOLD (no
// migration needed) while the brand-facing label is "Selecta Premium".
export const CONDITION_GRADE_LABELS: Record<ConditionGrade, string> = {
  SELECTA_GOLD: "Selecta Premium — almost new",
  SELECTA_CLASSIC: "Selecta Classic — excellent condition",
  SELECTA_VALUE: "Selecta Value — good everyday wear",
};

export const GENDER_LABELS: Record<ProductGender, string> = {
  MALE: "Men",
  FEMALE: "Women",
  UNISEX: "Unisex",
  KIDS: "Kids",
};

export const IMAGE_KIND_LABELS: Record<ProductImageKind, string> = {
  FRONT: "Front",
  BACK: "Back",
  DETAIL: "Detail",
  DEFECT: "Defect",
  OTHER: "Other",
};

const MIN_IMAGES = 2;
const MAX_IMAGES = 10;

export const productImageInputSchema = z.object({
  url: z.url(),
  kind: z.enum(ProductImageKind).default("OTHER"),
});

/** Step 1 — pictures. Sellers upload straight from their phone. */
export const productImagesSchema = z.object({
  images: z
    .array(productImageInputSchema)
    .min(MIN_IMAGES, `Add at least ${MIN_IMAGES} photos so buyers can trust the listing`)
    .max(MAX_IMAGES, `You can add up to ${MAX_IMAGES} photos`),
});

/** Step 2 — product details. */
export const productDetailsSchema = z.object({
  title: z.string().min(3, "Give it a short, clear title").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Choose a category"),
  subcategoryId: z.string().optional().or(z.literal("")),
  brand: z.string().max(60).optional().or(z.literal("")),
  color: z.string().max(40).optional().or(z.literal("")),
  material: z.string().max(60).optional().or(z.literal("")),
  gender: z.enum(ProductGender).optional().or(z.literal("")),
  size: z.string().max(30).optional().or(z.literal("")),
  conditionGrade: z.enum(ConditionGrade),
});

/** Step 3 — pricing. */
export const productPricingSchema = z
  .object({
    estimatedValue: moneySchema.optional(),
    price: moneySchema,
    discountPrice: moneySchema.optional(),
  })
  .refine((data) => data.discountPrice === undefined || data.discountPrice < data.price, {
    message: "Discount price must be lower than the regular price",
    path: ["discountPrice"],
  });

/** Step 4 — location (defaults come from the seller's own profile). */
export const productLocationSchema = z.object({
  state: z.string().min(1, "State is required").max(60),
  city: z.string().min(1, "City is required").max(60),
  market: z.string().max(120).optional().or(z.literal("")),
  pickupLocation: z.string().max(200).optional().or(z.literal("")),
});

export type ProductImagesInput = z.infer<typeof productImagesSchema>;
export type ProductDetailsInput = z.infer<typeof productDetailsSchema>;
export type ProductPricingInput = z.infer<typeof productPricingSchema>;
export type ProductLocationInput = z.infer<typeof productLocationSchema>;

export const searchFiltersSchema = z.object({
  q: z.string().max(120).optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  size: z.string().optional(),
  gender: z.enum(ProductGender).optional(),
  conditionGrade: z.enum(ConditionGrade).optional(),
  minSellerRating: z.coerce.number().min(0).max(5).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
