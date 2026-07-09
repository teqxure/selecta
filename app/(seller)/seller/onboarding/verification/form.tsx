"use client";

import { useActionState } from "react";
import { submitVerificationAction, skipVerificationAction } from "./actions";
import type { OnboardingActionState } from "../personal/actions";
import { VerificationUploadForm } from "@/components/seller/VerificationUploadForm";

const initialState: OnboardingActionState = {};

export function OnboardingVerificationForm() {
  const [state, formAction] = useActionState(submitVerificationAction, initialState);

  return (
    <VerificationUploadForm
      formAction={formAction}
      error={state.error}
      secondaryActionLabel="Skip for now"
      secondaryFormAction={skipVerificationAction}
    />
  );
}
