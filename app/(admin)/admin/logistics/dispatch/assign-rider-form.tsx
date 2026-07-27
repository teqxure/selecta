"use client";

import { useActionState } from "react";
import { assignRiderAction, type DispatchActionState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: DispatchActionState = {};

export function AssignRiderForm({ deliveryId, riders }: { deliveryId: string; riders: { userId: string; name: string }[] }) {
  const [state, formAction] = useActionState(assignRiderAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <select name="riderUserId" required className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground">
        <option value="">Assign rider…</option>
        {riders.map((rider) => (
          <option key={rider.userId} value={rider.userId}>
            {rider.name}
          </option>
        ))}
      </select>
      <SubmitButton size="sm" variant="secondary">
        Assign
      </SubmitButton>
      {state.error && <FormError message={state.error} />}
    </form>
  );
}
