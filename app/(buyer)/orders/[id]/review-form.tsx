"use client";

import { useActionState } from "react";
import { createReviewAction, type CreateReviewState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateReviewState = {};

export function ReviewForm({ orderId, orderItemId, productTitle }: { orderId: string; orderItemId: string; productTitle: string }) {
  const boundAction = createReviewAction.bind(null, orderId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <p className="text-sm font-medium text-foreground">Rate &quot;{productTitle}&quot;</p>
      <FormError message={state.error} />
      <select name="rating" defaultValue="5" className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
        <option value="5">5 — Excellent</option>
        <option value="4">4 — Good</option>
        <option value="3">3 — Okay</option>
        <option value="2">2 — Poor</option>
        <option value="1">1 — Terrible</option>
      </select>
      <textarea
        name="comment"
        rows={2}
        placeholder="Optional comment"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <SubmitButton variant="secondary" size="sm" className="self-start">
        Submit review
      </SubmitButton>
    </form>
  );
}
