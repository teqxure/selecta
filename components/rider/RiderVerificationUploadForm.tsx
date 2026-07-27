import { IdCard, FileText, Bike, ShieldCheck } from "lucide-react";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

export interface RiderVerificationUploadFormProps {
  formAction: (formData: FormData) => void;
  error?: string;
  requiresLicense: boolean;
  defaultIdDocumentUrl?: string;
  defaultLicenseDocumentUrl?: string;
  defaultVehiclePhotoUrl?: string;
  submitLabel?: string;
}

/** Mirrors VerificationUploadForm (sellers) — no "skip" button here, unlike sellers, since a rider handles buyers' money and parcels and verification is a hard gate, not just a trust signal. */
export function RiderVerificationUploadForm({
  formAction,
  error,
  requiresLicense,
  defaultIdDocumentUrl,
  defaultLicenseDocumentUrl,
  defaultVehiclePhotoUrl,
  submitLabel = "Submit for review",
}: RiderVerificationUploadFormProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-start gap-3 rounded-xl bg-accent/10 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
          <p className="text-sm text-foreground">
            We review every rider before they can go available for deliveries — usually within 48 hours.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <IdCard className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <FileUploadField
                name="idDocumentUrl"
                label="Identity document"
                folder="rider-verification/identity"
                helperText="A valid government-issued ID (NIN, driver's licence, or passport)"
                defaultUrl={defaultIdDocumentUrl}
                required
              />
            </div>
            {requiresLicense && (
              <div className="flex flex-col items-center gap-2 text-center">
                <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                <FileUploadField
                  name="licenseDocumentUrl"
                  label="Driving license"
                  folder="rider-verification/license"
                  helperText="Required for your vehicle type"
                  defaultUrl={defaultLicenseDocumentUrl}
                  required
                />
              </div>
            )}
            <div className="flex flex-col items-center gap-2 text-center">
              <Bike className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <FileUploadField
                name="vehiclePhotoUrl"
                label="Vehicle photo"
                folder="rider-verification/vehicle"
                helperText="A clear photo of your vehicle"
                defaultUrl={defaultVehiclePhotoUrl}
                required
              />
            </div>
          </div>

          <FormError message={error} />

          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
