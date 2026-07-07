"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutActionState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CheckoutActionState = {};

export function CheckoutButton() {
  const [state, formAction] = useActionState(checkoutAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <FormError message={state.error} />
      <SubmitButton className="w-full" variant="accent">
        Place order
      </SubmitButton>
    </form>
  );
}
