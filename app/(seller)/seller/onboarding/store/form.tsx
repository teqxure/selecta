"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitStoreSetupAction } from "./actions";
import type { OnboardingActionState } from "../personal/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import { SELLER_PRODUCT_TYPES, SELLER_PRODUCT_TYPE_LABELS } from "@/lib/validators/onboarding";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const initialState: OnboardingActionState = {};

export function OnboardingStoreForm({
  defaultStoreName,
  defaultMarketLocation,
  defaultCity,
  defaultState,
  defaultCategoryTags,
  defaultLogoUrl,
  defaultBannerUrl,
  defaultBio,
  defaultInstagram,
  defaultTiktok,
  defaultFacebook,
  defaultOrderUpdatesOptIn,
  defaultSellerUpdatesOptIn,
  agreementAlreadyAccepted,
}: {
  defaultStoreName: string;
  defaultMarketLocation: string;
  defaultCity: string;
  defaultState: string;
  defaultCategoryTags: string[];
  defaultLogoUrl?: string;
  defaultBannerUrl?: string;
  defaultBio: string;
  defaultInstagram: string;
  defaultTiktok: string;
  defaultFacebook: string;
  defaultOrderUpdatesOptIn: boolean;
  defaultSellerUpdatesOptIn: boolean;
  agreementAlreadyAccepted: boolean;
}) {
  const [state, formAction] = useActionState(submitStoreSetupAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-5">
        <form action={formAction} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Required</p>

            <Input name="storeName" label="Store name" defaultValue={defaultStoreName} required />
            <Input
              name="marketLocation"
              label="Market / stall location"
              placeholder="e.g. Balogun Market, Shop 14"
              defaultValue={defaultMarketLocation}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input name="city" label="City" defaultValue={defaultCity} required />
              <Input name="state" label="State" defaultValue={defaultState} required />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">What do you sell?</legend>
              <div className="grid grid-cols-2 gap-2">
                {SELLER_PRODUCT_TYPES.map((type) => (
                  <label
                    key={type}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm",
                      defaultCategoryTags.includes(type) && "border-accent bg-accent/10",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="categoryTags"
                      value={type}
                      defaultChecked={defaultCategoryTags.includes(type)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    {SELLER_PRODUCT_TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm font-medium text-foreground">Contact preferences</legend>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="orderUpdatesOptIn"
                  defaultChecked={defaultOrderUpdatesOptIn}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Order updates</span>
                  <span className="block text-xs text-muted-foreground">Payment confirmations, shipping, delivery, and dispute updates.</span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="sellerUpdatesOptIn"
                  defaultChecked={defaultSellerUpdatesOptIn}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">Seller updates</span>
                  <span className="block text-xs text-muted-foreground">New orders, withdrawal status, and verification results.</span>
                </span>
              </label>
            </fieldset>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="agreementAccepted"
                defaultChecked={agreementAlreadyAccepted}
                className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
                required
              />
              <span className="text-sm text-foreground">
                I have read and accept the{" "}
                <Link href={ROUTES.sellerAgreement} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
                  Seller Agreement
                </Link>
                .
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-4 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Optional</p>

            <ImageUploadField name="logoUrl" label="Store logo" folder="store-logos" helperText="Square image works best" defaultUrl={defaultLogoUrl} />
            <ImageUploadField
              name="bannerUrl"
              label="Store banner"
              folder="store-banners"
              helperText="Shown at the top of your public storefront"
              defaultUrl={defaultBannerUrl}
            />
            <Input name="bio" label="Store description" defaultValue={defaultBio} placeholder="Tell buyers what makes your store worth following" />

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-foreground">Social links</legend>
              <Input name="instagram" placeholder="Instagram handle or URL" defaultValue={defaultInstagram} />
              <Input name="tiktok" placeholder="TikTok handle or URL" defaultValue={defaultTiktok} />
              <Input name="facebook" placeholder="Facebook page URL" defaultValue={defaultFacebook} />
            </fieldset>
          </div>

          <FormError message={state.error} />
          <SubmitButton className="w-full">Continue</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
