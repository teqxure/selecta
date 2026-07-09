"use client";

import { useActionState } from "react";
import { Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { cancelOfferAction, checkoutOfferAction, type CheckoutOfferState } from "@/app/(buyer)/messages/actions";

export interface OfferRow {
  id: string;
  amount: number;
  status: string;
  productTitle: string;
}

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  ACCEPTED: "success",
  REJECTED: "danger",
  COUNTERED: "neutral",
  EXPIRED: "neutral",
  CANCELLED: "neutral",
};

function CheckoutButton({ offerId }: { offerId: string }) {
  const boundCheckout = checkoutOfferAction.bind(null, offerId);
  const [state, formAction] = useActionState(boundCheckout, {} as CheckoutOfferState);
  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <FormError message={state.error} />
      <SubmitButton size="sm" variant="accent">
        Complete checkout
      </SubmitButton>
    </form>
  );
}

export function BuyerOfferPanel({ conversationId, offers }: { conversationId: string; offers: OfferRow[] }) {
  if (offers.length === 0) return null;
  const latest = offers[offers.length - 1];

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-accent" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-foreground">
              Offer: ₦{latest.amount.toLocaleString("en-NG")}
            </p>
            <p className="text-xs text-muted-foreground">on {latest.productTitle}</p>
          </div>
          <Badge tone={STATUS_TONE[latest.status]}>{latest.status.toLowerCase()}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {latest.status === "ACCEPTED" && <CheckoutButton offerId={latest.id} />}
          {latest.status === "PENDING" && (
            <form action={cancelOfferAction.bind(null, conversationId, latest.id)}>
              <Button type="submit" size="sm" variant="ghost">
                Withdraw
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
