"use client";

import { useActionState } from "react";
import { createBoostCampaignAction, type CreateBoostState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { BOOST_GOAL_LABELS } from "@/lib/constants/monetization";

const initialState: CreateBoostState = {};

const selectClassName =
  "h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-1 focus-visible:ring-offset-background";

export function BoostForm({ products }: { products: { id: string; title: string }[] }) {
  const [state, formAction] = useActionState(createBoostCampaignAction, initialState);

  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">You need at least one active listing to start a boost campaign.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormError message={state.error} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="boost-product" className="text-sm font-medium text-foreground">
          Product
        </label>
        <select id="boost-product" name="productId" required className={selectClassName}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="boost-goal" className="text-sm font-medium text-foreground">
          Campaign goal
        </label>
        <select id="boost-goal" name="goal" required className={selectClassName} defaultValue="VIEWS">
          {Object.entries(BOOST_GOAL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Input name="durationDays" type="number" min={1} max={30} defaultValue={7} label="Duration (days)" required />

      <SubmitButton variant="accent" size="sm" className="self-start">
        Start boost
      </SubmitButton>
    </form>
  );
}
