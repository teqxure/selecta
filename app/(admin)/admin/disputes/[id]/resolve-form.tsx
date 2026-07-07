"use client";

import { useActionState } from "react";
import type { DisputeActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import type { ButtonProps } from "@/components/ui/Button";

const initialState: DisputeActionState = {};

interface ResolveFormProps {
  disputeId: string;
  action: (prevState: DisputeActionState, formData: FormData) => Promise<DisputeActionState>;
  label: string;
  variant: ButtonProps["variant"];
  placeholder: string;
}

export function ResolveForm({ disputeId, action, label, variant, placeholder }: ResolveFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <div className="flex-1">
        <FormError message={state.error} />
        <Input name="resolution" placeholder={placeholder} />
      </div>
      <SubmitButton variant={variant} size="sm">
        {label}
      </SubmitButton>
    </form>
  );
}
