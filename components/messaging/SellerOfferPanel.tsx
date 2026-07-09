"use client";

import { useActionState, useState } from "react";
import { Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { acceptOfferAction, rejectOfferAction, counterOfferAction, type OfferActionState } from "@/app/(seller)/seller/messages/actions";

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

export function SellerOfferPanel({ conversationId, offers }: { conversationId: string; offers: OfferRow[] }) {
  const [showCounterForm, setShowCounterForm] = useState(false);
  const boundAccept = acceptOfferAction.bind(null, conversationId, offers.at(-1)?.id ?? "");
  const boundReject = rejectOfferAction.bind(null, conversationId, offers.at(-1)?.id ?? "");
  const boundCounter = counterOfferAction.bind(null, conversationId, offers.at(-1)?.id ?? "");
  const [acceptState, acceptAction] = useActionState(boundAccept, {} as OfferActionState);
  const [rejectState, rejectAction] = useActionState(boundReject, {} as OfferActionState);
  const [counterState, counterActionFn] = useActionState(boundCounter, {} as OfferActionState);

  if (offers.length === 0) return null;
  const latest = offers[offers.length - 1];

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-accent" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-foreground">Offer: ₦{latest.amount.toLocaleString("en-NG")}</p>
              <p className="text-xs text-muted-foreground">on {latest.productTitle}</p>
            </div>
            <Badge tone={STATUS_TONE[latest.status]}>{latest.status.toLowerCase()}</Badge>
          </div>

          {latest.status === "PENDING" && (
            <div className="flex shrink-0 items-center gap-2">
              <form action={acceptAction}>
                <SubmitButton size="sm" variant="accent">
                  Accept
                </SubmitButton>
              </form>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowCounterForm((v) => !v)}>
                Counter
              </Button>
              <form action={rejectAction}>
                <SubmitButton size="sm" variant="ghost">
                  Reject
                </SubmitButton>
              </form>
            </div>
          )}
        </div>

        <FormError message={acceptState.error || rejectState.error} />

        {showCounterForm && (
          <form action={counterActionFn} className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <FormError message={counterState.error} />
              <label htmlFor="counter-amount" className="text-xs font-medium text-muted-foreground">
                Counter amount (₦)
              </label>
              <input
                id="counter-amount"
                name="amount"
                type="number"
                min="1"
                required
                className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <SubmitButton size="sm" variant="accent">
              Send counter
            </SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
