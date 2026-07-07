"use client";

import { useActionState } from "react";
import { updateProductPricingAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: ProductWizardActionState = {};
const currencyFormat = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

export function PricingForm({
  productId,
  defaultEstimatedValue,
  defaultPrice,
  defaultDiscountPrice,
  suggestedRange,
  isDraft,
}: {
  productId: string;
  defaultEstimatedValue: string;
  defaultPrice: string;
  defaultDiscountPrice: string;
  suggestedRange: { low: number; high: number } | null;
  isDraft: boolean;
}) {
  const boundAction = updateProductPricingAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        {suggestedRange && (
          <div className="rounded-lg border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-foreground">
            Similar products sell between{" "}
            <strong className="font-semibold">
              {currencyFormat(suggestedRange.low)} – {currencyFormat(suggestedRange.high)}
            </strong>
          </div>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <Input
            name="estimatedValue"
            type="number"
            step="0.01"
            min="0"
            label="Original estimated value (optional)"
            defaultValue={defaultEstimatedValue}
            helperText="What this item would cost new — helps buyers see the value"
          />
          <Input
            name="price"
            type="number"
            step="0.01"
            min="0"
            label="Selling price (₦)"
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
