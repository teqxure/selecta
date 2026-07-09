"use client";

import { useActionState } from "react";
import Link from "next/link";
import { fileDisputeAction, type FileDisputeState } from "./actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { ROUTES } from "@/lib/constants/routes";

const initialState: FileDisputeState = {};

interface SellerOption {
  id: string;
  label: string;
}

export function DisputeForm({ orderId, sellers }: { orderId: string; sellers: SellerOption[] }) {
  const [state, formAction] = useActionState(fileDisputeAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm text-muted-foreground">
        Your report has been submitted — Selecta will review it and follow up.{" "}
        {state.conversationId && (
          <Link href={ROUTES.message(state.conversationId)} className="font-medium text-accent hover:underline">
            Discuss it with the seller →
          </Link>
        )}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <input type="hidden" name="orderId" value={orderId} />

      {sellers.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sellerId" className="text-sm font-medium text-foreground">
            Which seller is this about?
          </label>
          <select
            id="sellerId"
            name="sellerId"
            className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
          >
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {sellers.length === 1 && <input type="hidden" name="sellerId" value={sellers[0].id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className="text-sm font-medium text-foreground">
          What&apos;s wrong?
        </label>
        <select id="type" name="type" className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground">
          <option value="NOT_RECEIVED">I never received this item</option>
          <option value="WRONG_ITEM">I received the wrong item</option>
          <option value="DAMAGED_ITEM">The item arrived damaged</option>
          <option value="OTHER">Something else</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Details
        </label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={4}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm text-foreground"
          placeholder="Tell us what happened..."
        />
      </div>

      <SubmitButton variant="outline" className="self-start">
        Report a problem
      </SubmitButton>
    </form>
  );
}
