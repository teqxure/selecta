"use client";

import { useActionState } from "react";
import { submitStoreSetupAction } from "./actions";
import type { OnboardingActionState } from "../personal/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { SELLER_PRODUCT_TYPES, SELLER_PRODUCT_TYPE_LABELS } from "@/lib/validators/onboarding";
import { cn } from "@/lib/utils";

const initialState: OnboardingActionState = {};

export function OnboardingStoreForm({
  defaultStoreName,
  defaultMarketLocation,
  defaultCity,
  defaultState,
  defaultCategoryTags,
}: {
  defaultStoreName: string;
  defaultMarketLocation: string;
  defaultCity: string;
  defaultState: string;
  defaultCategoryTags: string[];
}) {
  const [state, formAction] = useActionState(submitStoreSetupAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="storeName" label="Store name" defaultValue={defaultStoreName} required />
          <Input
            name="marketLocation"
            label="Market / stall location"
            placeholder="e.g. Balogun Market, Shop 14"
            defaultValue={defaultMarketLocation}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input name="city" label="City" defaultValue={defaultCity} required />
            <Input name="state" label="State" defaultValue={defaultState} required />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">What do you sell?</legend>
            <div className="grid grid-cols-2 gap-2">
              {SELLER_PRODUCT_TYPES.map((type) => (
                <label
                  key={type}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm",
                    defaultCategoryTags.includes(type) && "border-accent bg-accent/10",
                  )}
                >
                  <input
                    type="checkbox"
                    name="categoryTags"
                    value={type}
                    defaultChecked={defaultCategoryTags.includes(type)}
                    className="h-4 w-4 rounded border-border accent-accent"
                  />
                  {SELLER_PRODUCT_TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </fieldset>

          <FormError message={state.error} />
          <SubmitButton className="w-full">Continue</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
