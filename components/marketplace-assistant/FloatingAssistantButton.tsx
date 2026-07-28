"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Fixed bottom-right, above MobileBottomNav (fixed bottom-0 z-40) on
 * mobile — same offset technique MessageThread.tsx uses for its compose
 * bar (bottom-16 to clear the same nav).
 */
export function FloatingAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Ask Selecta"
      className="fixed right-4 bottom-24 z-50 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-accent-foreground shadow-[0_8px_24px_-8px_rgba(196,90,31,0.6)] hover:opacity-90 md:right-6 md:bottom-6"
    >
      <Sparkles className="h-4 w-4" strokeWidth={2} />
      Ask Selecta
    </motion.button>
  );
}
