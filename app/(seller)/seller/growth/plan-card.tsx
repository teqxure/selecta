"use client";

import { useActionState } from "react";
import { subscribeToPlanAction, type SubscribeActionState } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";

const initialState: SubscribeActionState = {};

export interface PlanSummary {
  id: string;
  name: string;
  monthlyPrice: number;
  durationDays: number;
  maxProducts: number | null;
  boostCreditsPerCycle: number;
  hasAnalyticsAccess: boolean;
  hasFeaturedStore: boolean;
  hasPrioritySupport: boolean;
}

export function PlanCard({ plan, isCurrent }: { plan: PlanSummary; isCurrent: boolean }) {
  const [state, formAction] = useActionState(subscribeToPlanAction, initialState);
  const format = (value: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);

  return (
    <Card className={isCurrent ? "border-accent/50" : undefined}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrent && <Badge tone="accent">Current plan</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="font-display text-2xl font-semibold text-foreground">
          {plan.monthlyPrice === 0 ? "Free" : format(plan.monthlyPrice)}
          {plan.monthlyPrice > 0 && <span className="text-sm font-normal text-muted-foreground"> / {plan.durationDays} days</span>}
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-secondary-foreground">
          <li>{plan.maxProducts === null ? "Unlimited products" : `Up to ${plan.maxProducts} products`}</li>
          <li>{plan.boostCreditsPerCycle} boost credits per cycle</li>
          <li className={plan.hasAnalyticsAccess ? "" : "text-muted-foreground line-through"}>Advanced analytics</li>
          <li className={plan.hasFeaturedStore ? "" : "text-muted-foreground line-through"}>Featured store placement</li>
          <li className={plan.hasPrioritySupport ? "" : "text-muted-foreground line-through"}>Priority support</li>
        </ul>
        <FormError message={state.error} />
        {!isCurrent && (
          <form action={formAction}>
            <input type="hidden" name="planId" value={plan.id} />
            <SubmitButton variant="accent" size="sm" className="w-full">
              {plan.monthlyPrice === 0 ? "Switch to this plan" : "Upgrade"}
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
