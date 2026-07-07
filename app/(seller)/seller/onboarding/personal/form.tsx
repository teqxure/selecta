"use client";

import { useActionState } from "react";
import { submitPersonalInfoAction, type OnboardingActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: OnboardingActionState = {};

export function OnboardingPersonalForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
}) {
  const [state, formAction] = useActionState(submitPersonalInfoAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" defaultValue={defaultFirstName} required />
            <Input name="lastName" label="Last name" defaultValue={defaultLastName} required />
          </div>
          <Input name="phone" type="tel" label="Phone number" defaultValue={defaultPhone} required />
          <FormError message={state.error} />
          <SubmitButton className="w-full">Continue</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
