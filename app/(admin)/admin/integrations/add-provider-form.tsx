"use client";

import { useState } from "react";
import { upsertIntegrationSettingAction } from "./actions";
import { PROVIDER_CATALOG } from "@/lib/constants/integration-providers";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { IntegrationCategory } from "@/generated/prisma/enums";

const CATEGORIES = Object.keys(PROVIDER_CATALOG) as IntegrationCategory[];

export function AddProviderForm() {
  const [category, setCategory] = useState<IntegrationCategory>("PAYMENT");
  const [providerChoice, setProviderChoice] = useState<string>(PROVIDER_CATALOG.PAYMENT[0]?.value ?? "other");

  const knownProviders = PROVIDER_CATALOG[category] ?? [];
  const isOther = providerChoice === "other";

  return (
    <form action={upsertIntegrationSettingAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm font-medium text-foreground">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) => {
            const next = event.target.value as IntegrationCategory;
            setCategory(next);
            setProviderChoice(PROVIDER_CATALOG[next]?.[0]?.value ?? "other");
          }}
          className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
        >
          {CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="providerChoice" className="text-sm font-medium text-foreground">
          Provider
        </label>
        <select
          id="providerChoice"
          value={providerChoice}
          onChange={(event) => setProviderChoice(event.target.value)}
          className="h-11 rounded-lg border border-border bg-background px-4 text-sm text-foreground"
        >
          {knownProviders.map((spec) => (
            <option key={spec.value} value={spec.value}>
              {spec.label}
            </option>
          ))}
          <option value="other">Other (custom provider name)</option>
        </select>
      </div>

      {isOther ? (
        <Input name="provider" label="Provider name" placeholder="my-custom-provider" required />
      ) : (
        <input type="hidden" name="provider" value={providerChoice} />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isEnabled" className="h-4 w-4 rounded border-border accent-[color:var(--color-burnt-orange)]" />
        Enabled
      </label>
      <Button type="submit" variant="accent" className="self-start">
        Add provider
      </Button>
    </form>
  );
}
