"use client";

import { useActionState } from "react";
import { createCouponAction, type CreateCouponActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: CreateCouponActionState = {};

export function CreateCouponForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, formAction] = useActionState(createCouponAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <div className="grid grid-cols-2 gap-4">
        <Input name="code" label="Coupon code" placeholder="WELCOME10" required />
        <Input name="description" label="Description" placeholder="Optional" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="discountType" className="text-sm font-medium text-foreground">
            Discount type
          </label>
          <select id="discountType" name="discountType" className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
          </select>
        </div>
        <Input name="discountValue" type="number" step="0.01" label="Discount value" required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input name="minOrderAmount" type="number" step="0.01" label="Min order amount" placeholder="Optional" />
        <Input name="maxDiscountAmount" type="number" step="0.01" label="Max discount cap" placeholder="Optional, % only" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input name="usageLimit" type="number" label="Total usage limit" placeholder="Optional" />
        <Input name="usageLimitPerUser" type="number" label="Usage limit per user" placeholder="Optional" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input name="startsAt" type="datetime-local" label="Starts at" />
        <Input name="endsAt" type="datetime-local" label="Ends at" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="applicableCategoryId" className="text-sm font-medium text-foreground">
          Restrict to category
        </label>
        <select
          id="applicableCategoryId"
          name="applicableCategoryId"
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton variant="accent" className="self-start">
        Create coupon
      </SubmitButton>
    </form>
  );
}
