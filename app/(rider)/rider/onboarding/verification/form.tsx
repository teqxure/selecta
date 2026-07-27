"use client";

import { useActionState } from "react";
import { submitRiderVerificationAction } from "./actions";
import type { RiderOnboardingActionState } from "../personal/actions";
import { RiderVerificationUploadForm } from "@/components/rider/RiderVerificationUploadForm";

const initialState: RiderOnboardingActionState = {};

export function RiderOnboardingVerificationForm({ requiresLicense }: { requiresLicense: boolean }) {
  const [state, formAction] = useActionState(submitRiderVerificationAction, initialState);

  return <RiderVerificationUploadForm formAction={formAction} error={state.error} requiresLicense={requiresLicense} />;
}
