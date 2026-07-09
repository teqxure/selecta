"use client";

import { useActionState } from "react";
import { submitVerificationAction, skipVerificationAction } from "./actions";
import type { OnboardingActionState } from "../personal/actions";
import { VerificationUploadForm } from "@/components/seller/VerificationUploadForm";
import { Button } from "@/components/ui/Button";

const initialState: OnboardingActionState = {};

export function OnboardingVerificationForm() {
  const [state, formAction] = useActionState(submitVerificationAction, initialState);

  return (
    <VerificationUploadForm
      formAction={formAction}
      error={state.error}
      secondaryAction={
        <form action={skipVerificationAction}>
          <Button type="submit" variant="ghost" className="w-full sm:w-auto">
            Skip for now
          </Button>
        </form>
      }
    />
  );
}
