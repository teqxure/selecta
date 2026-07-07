"use client";

import { useActionState } from "react";
import { submitVerificationAction } from "./actions";
import type { OnboardingActionState } from "../personal/actions";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: OnboardingActionState = {};

export function OnboardingVerificationForm() {
  const [state, formAction] = useActionState(submitVerificationAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-5">
        <form action={formAction} className="flex flex-col gap-5">
          <ImageUploadField
            name="businessPhotoUrl"
            label="Business photo"
            folder="seller-verification/business"
            helperText="A photo of you or your team at your business"
            required
          />
          <ImageUploadField
            name="shopPhotoUrl"
            label="Shop / stall photo"
            folder="seller-verification/shop"
            helperText="A clear photo of your shop front or market stall"
            required
          />
          <ImageUploadField
            name="identityDocumentUrl"
            label="Identity document"
            folder="seller-verification/identity"
            helperText="A valid government-issued ID (NIN, driver's licence, or passport)"
            required
          />
          <FormError message={state.error} />
          <SubmitButton className="w-full">Submit for review</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
