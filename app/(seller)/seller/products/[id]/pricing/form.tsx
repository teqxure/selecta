"use client";

import { useActionState } from "react";
import { updateProductPricingAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: ProductWizardActionState = {};

export function PricingForm({
  productId,
  defaultPrice,
  defaultDiscountPrice,
  isDraft,
}: {
  productId: string;
  defaultPrice: string;
  defaultDiscountPrice: string;
  isDraft: boolean;
}) {
  const boundAction = updateProductPricingAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            label="Price (₦)"
            defaultValue={defaultPrice}
            required
          />
          <Input
            name="discountPrice"
            type="number"
            step="0.01"
            min="0"
            label="Discount price (optional)"
            defaultValue={defaultDiscountPrice}
            helperText="Shown as a strikethrough price to buyers"
          />
          <FormError message={state.error} />
          <SubmitButton className="w-full">{isDraft ? "Continue" : "Save pricing"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
