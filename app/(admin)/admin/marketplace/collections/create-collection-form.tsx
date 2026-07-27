"use client";

import { useActionState } from "react";
import { createCollectionAction, type CreateCollectionActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateCollectionActionState = {};

export function CreateCollectionForm() {
  const [state, formAction] = useActionState(createCollectionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="name" label="Name" placeholder="Ankara Edit" required />
        <Input name="slug" label="Slug" placeholder="ankara-edit" required />
      </div>
      <Input name="description" label="Description" placeholder="Optional" />
      <Input name="imageUrl" label="Image URL" placeholder="Optional" />
      <SubmitButton variant="accent" className="self-start">
        Create collection
      </SubmitButton>
    </form>
  );
}
