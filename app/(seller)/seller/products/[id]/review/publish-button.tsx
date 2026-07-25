"use client";

import Link from "next/link";
import { useActionState } from "react";
import { publishProductAction, type ReviewActionState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { ROUTES } from "@/lib/constants/routes";

const initialState: ReviewActionState = {};

export function PublishButton({ productId }: { productId: string }) {
  const boundAction = publishProductAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      {state.needsVerification && (
        <Link href={ROUTES.seller.verification} className="text-sm font-medium text-accent hover:underline">
          Verify your store now →
        </Link>
      )}
      <SubmitButton className="w-full" variant="accent">
        Submit for review
      </SubmitButton>
    </form>
  );
}
