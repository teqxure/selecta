import { z } from "zod";
import { nigerianPhoneSchema } from "@/lib/validators/common";

export const updateBuyerProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: nigerianPhoneSchema.optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  state: z.string().max(60).optional().or(z.literal("")),
});

export const updateSellerSettingsSchema = z.object({
  storeName: z.string().min(2).max(80),
  bio: z.string().max(500).optional().or(z.literal("")),
  marketLocation: z.string().min(2).max(120),
  city: z.string().min(1).max(60),
  state: z.string().min(1).max(60),
  bannerUrl: z.url().optional().or(z.literal("")),
});

export const addressSchema = z.object({
  label: z.string().max(40).optional().or(z.literal("")),
  line1: z.string().min(1, "Address line is required").max(150),
  line2: z.string().max(150).optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(60),
  state: z.string().min(1, "State is required").max(60),
  phone: nigerianPhoneSchema.optional().or(z.literal("")),
  isDefault: z.preprocess((v) => v === "on" || v === true, z.boolean()).optional().default(false),
});

export type UpdateBuyerProfileInput = z.infer<typeof updateBuyerProfileSchema>;
export type UpdateSellerSettingsInput = z.infer<typeof updateSellerSettingsSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
