"use client";

import { useActionState } from "react";
import { requestWithdrawalAction, type RequestWithdrawalState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: RequestWithdrawalState = {};

export function WithdrawalForm({ availableBalance }: { availableBalance: number }) {
  const [state, formAction] = useActionState(requestWithdrawalAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Input
        name="amount"
        type="number"
        step="0.01"
        min="1"
        max={availableBalance || undefined}
        label="Amount"
        placeholder="10000"
        required
      />
      <Input name="bankName" label="Bank name" placeholder="GTBank" required />
      <Input name="accountNumber" label="Account number" placeholder="0123456789" required />
      <Input name="accountName" label="Account name" placeholder="Jane Doe" required />
      <SubmitButton variant="accent" className="self-start">
        Request withdrawal
      </SubmitButton>
    </form>
  );
}
