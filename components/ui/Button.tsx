"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:opacity-90",
        secondary: "bg-secondary text-secondary-foreground border border-border hover:bg-muted",
        accent: "bg-accent text-accent-foreground shadow-[0_8px_20px_-8px_rgba(196,90,31,0.6)] hover:bg-[color:var(--color-burnt-orange-bright)]",
        outline: "border border-border bg-transparent text-foreground hover:bg-muted",
        ghost: "bg-transparent text-foreground hover:bg-muted",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

/**
 * Omits the handlers where React DOM and Framer Motion disagree on event
 * shape (motion.button redefines onDrag* for gesture tracking) — the
 * standard workaround for wrapping a native element with motion().
 */
type ConflictingHandlers = "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingHandlers>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
