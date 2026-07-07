"use client";

import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/(buyer)/actions";
import { Button } from "@/components/ui/Button";

export function AddToCartButton({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="accent"
      className="w-full"
      disabled={isPending || added}
      onClick={() =>
        startTransition(async () => {
          await addToCartAction(productId);
          setAdded(true);
        })
      }
    >
      {added ? "Added to cart ✓" : isPending ? "Adding…" : "Add to cart"}
    </Button>
  );
}
