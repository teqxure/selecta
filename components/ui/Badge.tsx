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

/** Maps the SellerVerificationStatus / UserStatus enum values to a badge tone. */
export const STATUS_TONE: Record<string, BadgeProps["tone"]> = {
  ACTIVE: "success",
  VERIFIED: "success",
  PENDING: "warning",
  INACTIVE: "neutral",
  REJECTED: "danger",
  SUSPENDED: "danger",
  BANNED: "danger",
};
