"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { MapPin, Truck, Zap, Store } from "lucide-react";
import { checkoutAction, type CheckoutActionState } from "@/app/(buyer)/cart/actions";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { DeliveryFulfillmentType } from "@/generated/prisma/enums";

export interface CheckoutAddress {
  id: string;
  label: string | null;
  line1: string;
  city: string;
  state: string;
  isDefault: boolean;
}

export interface SellerGroupQuote {
  distanceKm: number;
  estimatedMinutes: number;
  zoneLabel: string;
  price: number;
  currency: string;
  pickupEligible: boolean;
  sameDayEligible: boolean;
  expressEligible: boolean;
  expressSurcharge: number;
}

export interface SellerGroup {
  sellerId: string;
  sellerName: string;
  itemTitles: string[];
  subtotal: number;
  offersPickup: boolean;
  quote: SellerGroupQuote | null;
  quoteError: string | null;
}

const initialState: CheckoutActionState = {};

const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);

function feeForFulfillment(quote: SellerGroupQuote, type: DeliveryFulfillmentType): number {
  if (type === "PICKUP") return 0;
  if (type === "EXPRESS") return quote.price + quote.expressSurcharge;
  return quote.price;
}

function FulfillmentOption({
  label,
  icon: Icon,
  price,
  eta,
  selected,
  onSelect,
}: {
  label: string;
  icon: typeof Truck;
  price: number;
  eta?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
        selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
      }`}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{price === 0 ? "Free" : formatNaira(price)}{eta ? ` · ${eta}` : ""}</span>
    </button>
  );
}

export function CartCheckoutPanel({ addresses, sellerGroups }: { addresses: CheckoutAddress[]; sellerGroups: SellerGroup[] }) {
  const [state, formAction] = useActionState(checkoutAction, initialState);
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const [fulfillmentBySeller, setFulfillmentBySeller] = useState<Record<string, DeliveryFulfillmentType>>(
    Object.fromEntries(sellerGroups.map((g) => [g.sellerId, "STANDARD" as DeliveryFulfillmentType])),
  );

  const itemsSubtotal = sellerGroups.reduce((sum, g) => sum + g.subtotal, 0);
  const deliveryTotal = useMemo(
    () =>
      sellerGroups.reduce((sum, g) => {
        if (!g.quote) return sum;
        return sum + feeForFulfillment(g.quote, fulfillmentBySeller[g.sellerId] ?? "STANDARD");
      }, 0),
    [sellerGroups, fulfillmentBySeller],
  );
  const hasBlockingError = sellerGroups.some((g) => g.quoteError) || !addressId;

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (hasBlockingError) event.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="addressId" value={addressId} />
      {sellerGroups.map((g) => (
        <input key={g.sellerId} type="hidden" name={`fulfillment_${g.sellerId}`} value={fulfillmentBySeller[g.sellerId] ?? "STANDARD"} />
      ))}

      {addresses.length > 1 ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <p className="text-sm font-medium text-foreground">Deliver to</p>
            {addresses.map((address) => (
              <label
                key={address.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5"
              >
                <input
                  type="radio"
                  name="_addressPicker"
                  className="mt-1 accent-accent"
                  checked={addressId === address.id}
                  onChange={() => setAddressId(address.id)}
                />
                <span>
                  <span className="font-medium text-foreground">{address.label || "Address"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {address.line1}, {address.city}, {address.state}
                  </span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
      ) : addresses.length === 1 ? (
        <Card>
          <CardContent className="flex items-start gap-2 p-4 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
            <span className="text-muted-foreground">
              Delivering to <span className="text-foreground">{addresses[0].line1}, {addresses[0].city}</span>
            </span>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            Add a delivery address to your{" "}
            <Link href={ROUTES.profile} className="underline">
              profile
            </Link>{" "}
            before checking out.
          </CardContent>
        </Card>
      )}

      {sellerGroups.map((g) => (
        <Card key={g.sellerId}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{g.sellerName}</p>
              <p className="text-sm text-muted-foreground">{formatNaira(g.subtotal)}</p>
            </div>

            {g.quoteError ? (
              <p className="text-xs text-red-600">{g.quoteError}</p>
            ) : g.quote ? (
              <div className="flex gap-2">
                <FulfillmentOption
                  label="Standard"
                  icon={Truck}
                  price={g.quote.price}
                  eta={`~${Math.round(g.quote.estimatedMinutes / 60) || 1}h`}
                  selected={(fulfillmentBySeller[g.sellerId] ?? "STANDARD") === "STANDARD"}
                  onSelect={() => setFulfillmentBySeller((prev) => ({ ...prev, [g.sellerId]: "STANDARD" }))}
                />
                {g.quote.expressEligible && (
                  <FulfillmentOption
                    label="Express"
                    icon={Zap}
                    price={g.quote.price + g.quote.expressSurcharge}
                    eta={g.quote.sameDayEligible ? "same day" : undefined}
                    selected={fulfillmentBySeller[g.sellerId] === "EXPRESS"}
                    onSelect={() => setFulfillmentBySeller((prev) => ({ ...prev, [g.sellerId]: "EXPRESS" }))}
                  />
                )}
                {g.quote.pickupEligible && g.offersPickup && (
                  <FulfillmentOption
                    label="Pickup"
                    icon={Store}
                    price={0}
                    selected={fulfillmentBySeller[g.sellerId] === "PICKUP"}
                    onSelect={() => setFulfillmentBySeller((prev) => ({ ...prev, [g.sellerId]: "PICKUP" }))}
                  />
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Items</span>
            <span>{formatNaira(itemsSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Delivery</span>
            <span>{formatNaira(deliveryTotal)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5 font-medium text-secondary-foreground">
            <span>Total</span>
            <span className="text-lg font-semibold text-accent">{formatNaira(itemsSubtotal + deliveryTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <FormError message={state.error} />
      <SubmitButton className="w-full" variant="accent">
        Place order
      </SubmitButton>
    </form>
  );
}
