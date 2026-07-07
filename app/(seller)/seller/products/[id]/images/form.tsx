"use client";

import { useActionState } from "react";
import { updateProductImagesAction } from "./actions";
import type { ProductWizardActionState } from "../../new/actions";
import type { ProductImageKind } from "@/generated/prisma/enums";
import { MultiImageUploadField } from "@/components/forms/MultiImageUploadField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

const initialState: ProductWizardActionState = {};

export function ImagesForm({
  productId,
  defaultImages,
  isDraft,
}: {
  productId: string;
  defaultImages: { url: string; kind: ProductImageKind }[];
  isDraft: boolean;
}) {
  const boundAction = updateProductImagesAction.bind(null, productId);
  const [state, formAction] = useActionState(boundAction, initialState);

  return (
    <Card>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <MultiImageUploadField name="images" folder="products" min={2} max={10} defaultImages={defaultImages} />
          <FormError message={state.error} />
          <SubmitButton className="w-full">{isDraft ? "Continue" : "Save photos"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
