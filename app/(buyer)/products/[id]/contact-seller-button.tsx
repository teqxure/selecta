"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { MessageCircle, Tag } from "lucide-react";
import { startProductConversationAction, makeOfferAction, type MakeOfferState } from "./actions";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { ROUTES } from "@/lib/constants/routes";

const initialOfferState: MakeOfferState = {};

export function ContactSellerButton({ productId, isLoggedIn }: { productId: string; isLoggedIn: boolean }) {
  const [showOfferForm, setShowOfferForm] = useState(false);
  const boundMakeOffer = makeOfferAction.bind(null, productId);
  const [offerState, offerAction] = useActionState(boundMakeOffer, initialOfferState);
  const boundStartConversation = startProductConversationAction.bind(null, productId);

  if (!isLoggedIn) {
    return (
      <Link href={`${ROUTES.login}?next=/products/${productId}`}>
        <Button variant="secondary" className="w-full">
          Log in to message seller
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <form action={boundStartConversation} className="flex-1">
          <SubmitButton variant="secondary" className="w-full">
            <MessageCircle className="h-4 w-4" strokeWidth={2} />
            Message seller
          </SubmitButton>
        </form>
        <Button variant="outline" className="flex-1" onClick={() => setShowOfferForm((v) => !v)}>
          <Tag className="h-4 w-4" strokeWidth={2} />
          Make an offer
        </Button>
      </div>

      {showOfferForm && (
        <form action={offerAction} className="flex items-end gap-2 rounded-lg border border-border bg-secondary p-3">
          <div className="flex flex-1 flex-col gap-1">
            <FormError message={offerState.error} />
            <label htmlFor="offer-amount" className="text-xs font-medium text-muted-foreground">
              Your offer (₦)
            </label>
            <input
              id="offer-amount"
              name="amount"
              type="number"
              min="1"
              required
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <SubmitButton size="sm" variant="accent">
            Send offer
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
