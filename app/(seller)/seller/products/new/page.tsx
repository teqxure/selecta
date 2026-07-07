"use client";

import { useActionState } from "react";
import { createDraftProductAction, type ProductWizardActionState } from "./actions";
import { MultiImageUploadField } from "@/components/forms/MultiImageUploadField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Stepper";

const initialState: ProductWizardActionState = {};
const STEPS = ["Photos", "Details", "Pricing", "Review"];

export default function NewProductPage() {
  const [state, formAction] = useActionState(createDraftProductAction, initialState);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-4">
      <Stepper steps={STEPS} currentStep={1} />
      <div>
        <h1 className="text-xl font-semibold text-foreground">Add photos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Clear photos sell faster. Add front, back, and any defects buyers should know about.
        </p>
      </div>
      <Card>
        <CardContent className="p-5">
          <form action={formAction} className="flex flex-col gap-4">
            <MultiImageUploadField name="images" folder="products" min={2} max={10} />
            <FormError message={state.error} />
            <SubmitButton className="w-full">Continue</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
