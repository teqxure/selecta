"use client";

import { useActionState, useState } from "react";
import { MapPin } from "lucide-react";
import { confirmDeliveryAction, type RiderActionState } from "@/app/(rider)/rider/actions";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import { SignatureCanvas } from "@/components/rider/SignatureCanvas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import type { ProofMethod } from "@/generated/prisma/enums";

const initialState: RiderActionState = {};

const METHODS: { value: ProofMethod; label: string }[] = [
  { value: "PIN", label: "PIN code" },
  { value: "QR", label: "QR / scan code" },
  { value: "PHOTO", label: "Photo at hand-off" },
  { value: "SIGNATURE", label: "Signature" },
  { value: "GPS", label: "GPS location only" },
];

export function ProofOfDeliveryForm({ deliveryId }: { deliveryId: string }) {
  const [state, formAction] = useActionState(confirmDeliveryAction, initialState);
  const [method, setMethod] = useState<ProofMethod>("PIN");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function captureLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormError message={state.error} />
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="method" value={method} />
      {signatureUrl && <input type="hidden" name="signatureUrl" value={signatureUrl} />}
      {coords && (
        <>
          <input type="hidden" name="latitude" value={coords.latitude} />
          <input type="hidden" name="longitude" value={coords.longitude} />
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Confirmation method</label>
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as ProofMethod)}
          className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
        >
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {method === "PIN" && <Input name="pin" label="PIN provided by the buyer" required />}
      {method === "QR" && <Input name="pin" label="Code from buyer's QR" helperText="Enter the code shown — camera scanning isn't required." required />}
      {method === "PHOTO" && <ImageUploadField name="photoUrl" label="Photo at hand-off" folder="proof-of-delivery" required />}
      {method === "SIGNATURE" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Buyer signature</label>
          <SignatureCanvas onSaved={setSignatureUrl} />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Location {method === "GPS" ? "(required)" : "(optional, recommended)"}
          </label>
          <Button type="button" size="sm" variant="outline" onClick={captureLocation} disabled={locating}>
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
            {locating ? "Locating…" : coords ? "Recapture" : "Capture location"}
          </Button>
        </div>
        {coords && (
          <p className="text-xs text-muted-foreground">
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
          </p>
        )}
      </div>

      <Input name="notes" label="Notes" placeholder="Optional" />

      {(method === "SIGNATURE" && !signatureUrl) || (method === "GPS" && !coords) ? (
        <Button type="button" variant="accent" className="self-start" disabled>
          {method === "SIGNATURE" ? "Save your signature first" : "Capture location first"}
        </Button>
      ) : (
        <SubmitButton variant="accent" className="self-start">
          Confirm delivery
        </SubmitButton>
      )}
    </form>
  );
}
