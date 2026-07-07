"use client";

import { useOptimistic, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { toggleSaveProductAction } from "@/app/(buyer)/actions";
import { cn } from "@/lib/utils";

export interface SaveButtonProps {
  productId: string;
  initialSaved: boolean;
  likeCount: number;
  className?: string;
}

export function SaveButton({ productId, initialSaved, likeCount, className }: SaveButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved);
  const displayCount = likeCount + (optimisticSaved ? 1 : 0) - (initialSaved ? 1 : 0);

  function handleClick() {
    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved);
      await toggleSaveProductAction(productId, optimisticSaved);
    });
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      whileTap={{ scale: 0.85 }}
      aria-pressed={optimisticSaved}
      aria-label={optimisticSaved ? "Remove from saved" : "Save item"}
      className={cn(
        "flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={optimisticSaved ? "saved" : "unsaved"}
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="flex"
        >
          <Heart
            className={cn("h-3.5 w-3.5", optimisticSaved ? "fill-accent text-accent" : "text-muted-foreground")}
            strokeWidth={2}
          />
        </motion.span>
      </AnimatePresence>
      {displayCount}
    </motion.button>
  );
}
