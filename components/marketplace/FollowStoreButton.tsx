"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFollowStoreAction } from "@/app/(buyer)/actions";
import { Button } from "@/components/ui/Button";

export function FollowStoreButton({
  sellerProfileId,
  initialFollowing,
}: {
  sellerProfileId: string;
  initialFollowing: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFollowing, setOptimisticFollowing] = useOptimistic(initialFollowing);

  function handleClick() {
    startTransition(async () => {
      setOptimisticFollowing(!optimisticFollowing);
      await toggleFollowStoreAction(sellerProfileId, optimisticFollowing);
    });
  }

  return (
    <Button
      variant={optimisticFollowing ? "secondary" : "accent"}
      size="sm"
      disabled={isPending}
      onClick={handleClick}
    >
      {optimisticFollowing ? "Following" : "Follow store"}
    </Button>
  );
}
