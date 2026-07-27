"use client";

import { useActionState } from "react";
import { createRiderAction, type CreateRiderActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateRiderActionState = {};

export function CreateRiderForm() {
  const [state, formAction] = useActionState(createRiderAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="firstName" label="First name" required />
        <Input name="lastName" label="Last name" required />
      </div>
      <Input name="email" type="email" label="Email" required />
      <PasswordInput name="password" label="Temporary password" helperText="At least 8 characters." required />
      <div className="grid grid-cols-2 gap-4">
        <Input name="vehicleType" label="Vehicle type" placeholder="Motorbike (optional)" />
        <Input name="vehiclePlateNumber" label="Plate number" placeholder="Optional" />
      </div>
      <SubmitButton variant="accent" className="self-start">
        Create rider account
      </SubmitButton>
    </form>
  );
}
