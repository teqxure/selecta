"use client";

import { useActionState } from "react";
import { updateProfileAction, type ProfileActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: ProfileActionState = {};

export function ProfileForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultCity,
  defaultState,
  email,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultCity: string;
  defaultState: string;
  email: string;
}) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <Input label="Email" value={email} disabled readOnly />
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" defaultValue={defaultFirstName} required />
            <Input name="lastName" label="Last name" defaultValue={defaultLastName} required />
          </div>
          <Input name="phone" type="tel" label="Phone number" defaultValue={defaultPhone} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="city" label="City" defaultValue={defaultCity} />
            <Input name="state" label="State" defaultValue={defaultState} />
          </div>
          <FormError message={state.error} />
          {state.success && <p className="text-sm text-green-700">Saved.</p>}
          <SubmitButton className="w-full">Save changes</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
