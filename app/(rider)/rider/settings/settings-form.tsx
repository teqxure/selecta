"use client";

import { useActionState } from "react";
import { updateRiderSettingsAction, type RiderSettingsActionState } from "./actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { RIDER_VEHICLE_TYPES, RIDER_VEHICLE_TYPE_LABELS } from "@/lib/validators/onboarding";

const initialState: RiderSettingsActionState = {};

export function RiderSettingsForm({
  defaultFirstName,
  defaultLastName,
  defaultPhone,
  defaultVehicleType,
  defaultVehiclePlateNumber,
}: {
  defaultFirstName: string;
  defaultLastName: string;
  defaultPhone: string;
  defaultVehicleType: string;
  defaultVehiclePlateNumber: string;
}) {
  const [state, formAction] = useActionState(updateRiderSettingsAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" defaultValue={defaultFirstName} required />
            <Input name="lastName" label="Last name" defaultValue={defaultLastName} required />
          </div>
          <Input name="phone" type="tel" label="Phone number" defaultValue={defaultPhone} required />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="vehicleType" className="text-sm font-medium text-foreground">
              Vehicle type
            </label>
            <select
              id="vehicleType"
              name="vehicleType"
              defaultValue={defaultVehicleType}
              required
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            >
              {RIDER_VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {RIDER_VEHICLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <Input name="vehiclePlateNumber" label="Plate number" defaultValue={defaultVehiclePlateNumber} placeholder="Optional" />

          <FormError message={state.error} />
          {state.success && <p className="text-sm text-green-600">Settings saved.</p>}
          <SubmitButton variant="accent" className="self-start">
            Save changes
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
