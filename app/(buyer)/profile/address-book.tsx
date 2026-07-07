"use client";

import { useActionState } from "react";
import { addAddressAction, deleteAddressAction, setDefaultAddressAction, type ProfileActionState } from "./actions";
import type { listAddresses } from "@/services/users/address.service";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type AddressRecord = Awaited<ReturnType<typeof listAddresses>>[number];

const initialState: ProfileActionState = {};

export function AddressBook({ addresses }: { addresses: AddressRecord[] }) {
  const [state, formAction] = useActionState(addAddressAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      {addresses.map((address) => (
        <Card key={address.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-secondary-foreground">{address.label || "Address"}</p>
                {address.isDefault && <Badge tone="accent">Default</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {address.line1}, {address.city}, {address.state}
              </p>
            </div>
            <div className="flex gap-2">
              {!address.isDefault && (
                <form action={setDefaultAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Set default
                  </Button>
                </form>
              )}
              <form action={deleteAddressAction}>
                <input type="hidden" name="addressId" value={address.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Remove
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="p-4">
          <form action={formAction} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-secondary-foreground">Add a new address</p>
            <Input name="label" label="Label" placeholder="Home, Work…" />
            <Input name="line1" label="Address" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="city" label="City" required />
              <Input name="state" label="State" required />
            </div>
            <Input name="phone" type="tel" label="Phone (for delivery)" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="isDefault" className="h-4 w-4 rounded border-border accent-accent" />
              Make this my default address
            </label>
            <FormError message={state.error} />
            <SubmitButton size="sm" variant="secondary">
              Add address
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
