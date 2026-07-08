"use client";

import { useActionState } from "react";
import { forcePasswordResetAction, type ForcePasswordResetActionState } from "../actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: ForcePasswordResetActionState = {};

export function ForcePasswordResetForm({ userId }: { userId: string }) {
  const [state, formAction] = useActionState(forcePasswordResetAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />
      <Input
        name="newPassword"
        type="password"
        label="New temporary password"
        helperText="At least 8 characters. Share this with the account holder yourself — Selecta doesn't email it."
        required
      />
      <FormError message={state.error} />
      {state.success && <p className="text-sm text-green-700">Password reset. All existing sessions were logged out.</p>}
      <SubmitButton variant="outline" size="sm" className="self-start">
        Force password reset
      </SubmitButton>
    </form>
  );
}
