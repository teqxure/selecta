"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Scroll-triggered entrance for server-rendered content. Children are
 * rendered on the server as usual — this just wraps them in a client
 * boundary that animates once when the section enters the viewport.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
