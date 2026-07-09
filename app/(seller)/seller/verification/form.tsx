"use client";

import { useActionState } from "react";
import { submitVerificationStandaloneAction, type VerificationActionState } from "./actions";
import { VerificationUploadForm } from "@/components/seller/VerificationUploadForm";

const initialState: VerificationActionState = {};

export function VerificationForm({
  defaultBusinessPhotoUrl,
  defaultShopPhotoUrl,
  defaultIdentityDocumentUrl,
}: {
  defaultBusinessPhotoUrl?: string;
  defaultShopPhotoUrl?: string;
  defaultIdentityDocumentUrl?: string;
}) {
  const [state, formAction] = useActionState(submitVerificationStandaloneAction, initialState);

  return (
    <>
      <VerificationUploadForm
        formAction={formAction}
        error={state.error}
        defaultBusinessPhotoUrl={defaultBusinessPhotoUrl}
        defaultShopPhotoUrl={defaultShopPhotoUrl}
        defaultIdentityDocumentUrl={defaultIdentityDocumentUrl}
      />
      {state.success && <p className="text-sm text-green-700">Submitted — we&apos;ll review it within 48 hours.</p>}
    </>
  );
}
