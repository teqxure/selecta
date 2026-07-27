"use client";

import { useActionState, useState } from "react";
import { resolveReturnAction, type ReturnActionState } from "../actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import type { ReturnOutcome } from "@/generated/prisma/enums";

const initialState: ReturnActionState = {};

const REFUND_OUTCOMES: ReturnOutcome[] = ["FULL_REFUND", "PARTIAL_REFUND", "REFUND_WITHOUT_RETURN"];

export function ResolveReturnForm({ returnId, maxAmount }: { returnId: string; maxAmount: number }) {
  const [state, formAction] = useActionState(resolveReturnAction, initialState);
  const [outcome, setOutcome] = useState<ReturnOutcome>("FULL_REFUND");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <input type="hidden" name="returnId" value={returnId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Outcome</label>
        <select
          name="outcome"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as ReturnOutcome)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="FULL_REFUND">Full refund</option>
          <option value="PARTIAL_REFUND">Partial refund</option>
          <option value="REFUND_WITHOUT_RETURN">Refund without return</option>
          <option value="REPLACEMENT">Replacement</option>
        </select>
      </div>

      {REFUND_OUTCOMES.includes(outcome) && (
        <Input
          name="refundAmount"
          type="number"
          step="0.01"
          max={maxAmount}
          label={`Refund amount (max ${maxAmount})`}
          defaultValue={outcome === "FULL_REFUND" ? maxAmount : undefined}
          required
        />
      )}

      <Input name="notes" label="Resolution notes" placeholder="Optional" />

      <SubmitButton variant="accent" className="self-start">
        Resolve return
      </SubmitButton>
    </form>
  );
}
