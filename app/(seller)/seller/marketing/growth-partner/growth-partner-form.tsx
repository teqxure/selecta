"use client";

import { useActionState } from "react";
import { applyForGrowthPartnerAction, type ApplyGrowthPartnerState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: ApplyGrowthPartnerState = {};

export function GrowthPartnerForm() {
  const [state, formAction] = useActionState(applyForGrowthPartnerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground">
          Tell us about your store
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="What are you hoping Selecta Growth Partner can help with?"
          className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        />
      </div>
      <SubmitButton variant="accent" size="sm" className="self-start">
        Submit application
      </SubmitButton>
    </form>
  );
}
