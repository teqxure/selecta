"use client";

import { useActionState } from "react";
import { updateSellerSettingsAction, type SettingsActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: SettingsActionState = {};

export function SellerSettingsForm({
  defaultStoreName,
  defaultBio,
  defaultMarketLocation,
  defaultCity,
  defaultState,
}: {
  defaultStoreName: string;
  defaultBio: string;
  defaultMarketLocation: string;
  defaultCity: string;
  defaultState: string;
}) {
  const [state, formAction] = useActionState(updateSellerSettingsAction, initialState);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="storeName" label="Store name" defaultValue={defaultStoreName} required />
          <Input name="bio" label="Store description" defaultValue={defaultBio} />
          <Input name="marketLocation" label="Market / stall location" defaultValue={defaultMarketLocation} required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="city" label="City" defaultValue={defaultCity} required />
            <Input name="state" label="State" defaultValue={defaultState} required />
          </div>
          <FormError message={state.error} />
          {state.success && <p className="text-sm text-green-700">Saved.</p>}
          <SubmitButton className="w-full">Save changes</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
