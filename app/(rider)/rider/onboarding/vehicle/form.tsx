"use client";

import { useActionState } from "react";
import { submitRiderVehicleAction } from "./actions";
import type { RiderOnboardingActionState } from "../personal/actions";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";
import { RIDER_VEHICLE_TYPES, RIDER_VEHICLE_TYPE_LABELS } from "@/lib/validators/onboarding";

const initialState: RiderOnboardingActionState = {};

export function RiderOnboardingVehicleForm({
  defaultVehicleType,
  defaultVehiclePlateNumber,
}: {
  defaultVehicleType: string;
  defaultVehiclePlateNumber: string;
}) {
  const [state, formAction] = useActionState(submitRiderVehicleAction, initialState);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <form action={formAction} className="flex flex-col gap-4">
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
              <option value="" disabled>
                Select a vehicle type
              </option>
              {RIDER_VEHICLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {RIDER_VEHICLE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <Input
            name="vehiclePlateNumber"
            label="Plate number"
            placeholder="Optional — leave blank for a bicycle"
            defaultValue={defaultVehiclePlateNumber}
          />
          <FormError message={state.error} />
          <SubmitButton className="w-full">Continue</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
