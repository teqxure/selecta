"use client";

import { useActionState } from "react";
import { createAdminAction, type CreateAdminActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { PermissionCheckboxes } from "@/components/admin/PermissionCheckboxes";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateAdminActionState = {};

export function CreateAdminForm() {
  const [state, formAction] = useActionState(createAdminAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="firstName" label="First name" required />
        <Input name="lastName" label="Last name" required />
      </div>
      <Input name="email" type="email" label="Email" required />
      <Input name="password" type="password" label="Temporary password" helperText="At least 8 characters." required />

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Permissions</p>
        <PermissionCheckboxes />
      </div>

      <SubmitButton variant="accent" className="self-start">
        Create admin
      </SubmitButton>
    </form>
  );
}
