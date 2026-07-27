"use client";

import { useActionState } from "react";
import { createSupportTicketAction, type CreateTicketActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateTicketActionState = {};

export function CreateTicketForm() {
  const [state, formAction] = useActionState(createSupportTicketAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <Input name="subject" label="Subject" required />
      <Input name="category" label="Category" placeholder="Optional — e.g. Account, Payments" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Description</label>
        <textarea
          name="description"
          required
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        />
      </div>
      <SubmitButton variant="accent" className="self-start">
        Submit ticket
      </SubmitButton>
    </form>
  );
}
