"use client";

import { useActionState } from "react";
import { publishProductAction, type ReviewActionState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: ReviewActionState = {};

export function PublishButton({ productId }: { productId: string }) {
  const boundAction = publishProductAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <SubmitButton className="w-full" variant="accent">
        Submit for review
      </SubmitButton>
    </form>
  );
}
