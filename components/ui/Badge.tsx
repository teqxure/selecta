import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      success: "bg-green-100 text-green-800",
      warning: "bg-amber-100 text-amber-800",
      danger: "bg-red-100 text-red-800",
      accent: "bg-accent/15 text-accent",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Maps status-ish enum values (SellerVerificationStatus, UserStatus, ProductStatus) to a badge tone. */
export const STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  ACTIVE: "success",
  VERIFIED: "success",
  PENDING: "warning",
  PENDING_REVIEW: "warning",
  PAUSED: "neutral",
  SOLD: "accent",
  INACTIVE: "neutral",
  REJECTED: "danger",
  REMOVED: "danger",
  SUSPENDED: "danger",
  BANNED: "danger",
};

/** Maps ConditionGrade enum values to a badge tone for product cards. */
export const CONDITION_GRADE_TONE: Record<string, BadgeProps["tone"]> = {
  SELECTA_GOLD: "accent",
  SELECTA_CLASSIC: "success",
  SELECTA_VALUE: "neutral",
};

export const CONDITION_GRADE_SHORT_LABELS: Record<string, string> = {
  SELECTA_GOLD: "Selecta Gold",
  SELECTA_CLASSIC: "Selecta Classic",
  SELECTA_VALUE: "Selecta Value",
};
