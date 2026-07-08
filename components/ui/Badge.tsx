import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      neutral: "bg-muted text-muted-foreground",
      success: "bg-[color:var(--color-olive-sage)]/15 text-[color:var(--color-olive-sage)]",
      warning: "bg-amber-100 text-amber-800",
      danger: "bg-red-100 text-red-800",
      accent: "bg-accent/15 text-accent",
    },
    /**
     * Tinted tones (translucent color over the tone hue) read fine sitting
     * on a solid card/table background, but they nearly disappear floating
     * directly over a photo — e.g. the condition-grade badge on a product
     * card, over a light-colored garment. `solid` swaps in a fully opaque
     * fill so the badge stays legible over any image.
     */
    solid: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { tone: "neutral", solid: true, className: "bg-foreground/85 text-background" },
    { tone: "success", solid: true, className: "bg-[color:var(--color-olive-sage)] text-white" },
    { tone: "warning", solid: true, className: "bg-amber-500 text-white" },
    { tone: "danger", solid: true, className: "bg-red-600 text-white" },
    { tone: "accent", solid: true, className: "bg-accent text-accent-foreground" },
  ],
  defaultVariants: { tone: "neutral", solid: false },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, solid, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, solid }), className)} {...props} />;
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
  CREATED: "neutral",
  AWAITING_PAYMENT: "warning",
  PAID: "accent",
  PROCESSING: "warning",
  READY_FOR_PICKUP: "warning",
  IN_TRANSIT: "accent",
  DELIVERED: "success",
  COMPLETED: "success",
  DISPUTED: "danger",
  CANCELLED: "danger",
  REQUESTED: "warning",
  OPEN: "warning",
  UNDER_REVIEW: "warning",
  RESOLVED_REFUND: "success",
  RESOLVED_RELEASE: "success",
  RESOLVED_PARTIAL: "success",
  CLOSED: "neutral",
};

/** Maps ConditionGrade enum values to a badge tone for product cards. */
export const CONDITION_GRADE_TONE: Record<string, BadgeProps["tone"]> = {
  SELECTA_GOLD: "accent",
  SELECTA_CLASSIC: "success",
  SELECTA_VALUE: "neutral",
};

export const CONDITION_GRADE_SHORT_LABELS: Record<string, string> = {
  SELECTA_GOLD: "Selecta Premium",
  SELECTA_CLASSIC: "Selecta Classic",
  SELECTA_VALUE: "Selecta Value",
};
