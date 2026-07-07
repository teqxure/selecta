"use client";

import { useTransition } from "react";
import { recordProductShareAction } from "@/app/(buyer)/actions";
import { Button } from "@/components/ui/Button";

export function ShareButton({ productId, title }: { productId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  function handleShare() {
    startTransition(async () => {
      await recordProductShareAction(productId);
      const url = `${window.location.origin}/products/${productId}`;
      if (navigator.share) {
        await navigator.share({ title, url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={handleShare}>
      Share
    </Button>
  );
}
