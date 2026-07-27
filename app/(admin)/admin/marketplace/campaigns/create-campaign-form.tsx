"use client";

import { useActionState } from "react";
import { createCampaignAction, type CreateCampaignActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateCampaignActionState = {};

export function CreateCampaignForm({
  collections,
  coupons,
}: {
  collections: { id: string; name: string }[];
  coupons: { id: string; code: string }[];
}) {
  const [state, formAction] = useActionState(createCampaignAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="name" label="Name" placeholder="End of Year Sale" required />
        <Input name="slug" label="Slug" placeholder="end-of-year-sale" required />
      </div>
      <Input name="description" label="Description" placeholder="Optional" />
      <Input name="bannerImageUrl" label="Banner image URL" placeholder="Optional" />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="collectionId" className="text-sm font-medium text-foreground">
            Linked collection
          </label>
          <select id="collectionId" name="collectionId" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">None</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="couponId" className="text-sm font-medium text-foreground">
            Linked coupon
          </label>
          <select id="couponId" name="couponId" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="">None</option>
            {coupons.map((coupon) => (
              <option key={coupon.id} value={coupon.id}>
                {coupon.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input name="startsAt" type="datetime-local" label="Starts at" />
        <Input name="endsAt" type="datetime-local" label="Ends at" />
      </div>

      <SubmitButton variant="accent" className="self-start">
        Create campaign
      </SubmitButton>
    </form>
  );
}
