"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Decorative editorial-collage image card for the hero — entrance + gentle idle float. */
export function FloatingCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 5, delay: delay + 0.6, repeat: Infinity, ease: "easeInOut" },
      }}
      className={cn(
        "absolute overflow-hidden rounded-2xl border border-primary-foreground/10 bg-secondary shadow-[var(--shadow-float)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
