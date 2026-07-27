"use client";

import { useActionState } from "react";
import { createDocumentTypeAction, type CreateDocumentTypeActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateDocumentTypeActionState = {};

export function CreateDocumentTypeForm() {
  const [state, formAction] = useActionState(createDocumentTypeAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="name" label="Name" placeholder="CAC Certificate" required />
        <Input name="category" label="Category" placeholder="Business (optional)" />
      </div>
      <Input name="description" label="Description" placeholder="Optional" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="requirement" className="text-sm font-medium text-foreground">
          Requirement
        </label>
        <select id="requirement" name="requirement" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          <option value="REQUIRED">Required</option>
          <option value="OPTIONAL">Optional</option>
          <option value="CONDITIONAL">Conditional</option>
        </select>
      </div>
      <Input name="conditionNote" label="Condition note" placeholder="e.g. Only for business accounts (if conditional)" />

      <SubmitButton variant="accent" className="self-start">
        Create document type
      </SubmitButton>
    </form>
  );
}
