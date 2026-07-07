"use client";

import { useOptimistic, useTransition } from "react";
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

  function handleClick() {
    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved);
      await toggleSaveProductAction(productId, optimisticSaved);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={optimisticSaved}
      aria-label={optimisticSaved ? "Remove from saved" : "Save item"}
      className={cn(
        "flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm",
        className,
      )}
    >
      <span className={optimisticSaved ? "text-accent" : "text-muted-foreground"}>{optimisticSaved ? "♥" : "♡"}</span>
      {likeCount + (optimisticSaved ? 1 : 0) - (initialSaved ? 1 : 0)}
    </button>
  );
}
