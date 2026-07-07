"use client";

import { useActionState } from "react";
import { updateProductLocationAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: ProductWizardActionState = {};

export function LocationForm({
  productId,
  defaultState,
  defaultCity,
  defaultMarket,
  defaultPickupLocation,
  isDraft,
}: {
  productId: string;
  defaultState: string;
  defaultCity: string;
  defaultMarket: string;
  defaultPickupLocation: string;
  isDraft: boolean;
}) {
  const boundAction = updateProductLocationAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="state" label="State" defaultValue={defaultState} required />
            <Input name="city" label="City" defaultValue={defaultCity} required />
          </div>
          <Input
            name="market"
            label="Market (optional)"
            placeholder="e.g. Balogun Market"
            defaultValue={defaultMarket}
          />
          <Input
            name="pickupLocation"
            label="Pickup location (optional)"
            placeholder="e.g. Shop 14, opposite the main gate"
            defaultValue={defaultPickupLocation}
          />
          <FormError message={state.error} />
          <SubmitButton className="w-full">{isDraft ? "Continue" : "Save location"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
