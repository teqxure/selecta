"use client";

import { useActionState } from "react";
import { requestReturnAction, type RequestReturnState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: RequestReturnState = {};

export function ReturnRequestForm({ orderId, orderItemId, productTitle }: { orderId: string; orderItemId: string; productTitle: string }) {
  const boundAction = requestReturnAction.bind(null, orderId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <p className="text-sm font-medium text-foreground">Return &quot;{productTitle}&quot;</p>
      <FormError message={state.error} />
      <textarea
        name="reason"
        required
        rows={2}
        placeholder="Why are you returning this item?"
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <SubmitButton variant="outline" size="sm" className="self-start">
        Request return
      </SubmitButton>
    </form>
  );
}
