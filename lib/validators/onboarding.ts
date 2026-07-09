import { z } from "zod";
import { nigerianPhoneSchema } from "@/lib/validators/common";

export const SELLER_PRODUCT_TYPES = [
  "MALE_CLOTHES",
  "FEMALE_CLOTHES",
  "CHILDREN_CLOTHES",
  "SHOES",
  "BAGS",
  "ACCESSORIES",
] as const;

export const SELLER_PRODUCT_TYPE_LABELS: Record<(typeof SELLER_PRODUCT_TYPES)[number], string> = {
  MALE_CLOTHES: "Male clothes",
  FEMALE_CLOTHES: "Female clothes",
  CHILDREN_CLOTHES: "Children's clothes",
  SHOES: "Shoes",
  BAGS: "Bags",
  ACCESSORIES: "Accessories",
};

/** Onboarding step 1 — confirm/complete personal info collected at signup. */
export const personalInfoSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: nigerianPhoneSchema,
});

/** Checkbox inputs arrive as "on" or are absent from FormData — never "true"/"false". */
const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());

/** Onboarding step 2 — the store itself. */
export const storeSetupSchema = z.object({
  storeName: z.string().min(2, "Store name must be at least 2 characters").max(80),
  marketLocation: z.string().min(2, "Tell buyers where your store/stall is").max(120),
  city: z.string().min(1, "City is required").max(60),
  state: z.string().min(1, "State is required").max(60),
  categoryTags: z
    .array(z.enum(SELLER_PRODUCT_TYPES))
    .min(1, "Select at least one product type"),
  logoUrl: z.url().optional().or(z.literal("")),
  bannerUrl: z.url().optional().or(z.literal("")),
  bio: z.string().max(500).optional().or(z.literal("")),
  instagram: z.string().max(100).optional().or(z.literal("")),
  tiktok: z.string().max(100).optional().or(z.literal("")),
  facebook: z.string().max(100).optional().or(z.literal("")),
  orderUpdatesOptIn: checkboxSchema,
  sellerUpdatesOptIn: checkboxSchema,
  agreementAccepted: checkboxSchema.refine((value) => value === true, {
    message: "You must accept the Seller Agreement to continue",
  }),
});

/** Onboarding step 3 — verification documents (URLs from a prior presigned upload). */
export const verificationSubmissionSchema = z.object({
  businessPhotoUrl: z.url("Upload a business photo first"),
  shopPhotoUrl: z.url("Upload a shop photo first"),
  identityDocumentUrl: z.url("Upload an identity document first"),
});

export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type StoreSetupInput = z.infer<typeof storeSetupSchema>;
export type VerificationSubmissionInput = z.infer<typeof verificationSubmissionSchema>;
