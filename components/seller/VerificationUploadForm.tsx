import type { ReactNode } from "react";
import { Building2, Store, FileText, ShieldCheck } from "lucide-react";
import { ImageUploadField } from "@/components/forms/ImageUploadField";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { Card, CardContent } from "@/components/ui/Card";

export interface VerificationUploadFormProps {
  formAction: (formData: FormData) => void;
  error?: string;
  defaultBusinessPhotoUrl?: string;
  defaultShopPhotoUrl?: string;
  defaultIdentityDocumentUrl?: string;
  submitLabel?: string;
  /** e.g. a "Skip for now" button, only relevant during onboarding. */
  secondaryAction?: ReactNode;
}

const FIELDS = [
  { name: "businessPhotoUrl", label: "Business photo", folder: "seller-verification/business", icon: Building2, helperText: "A photo of you or your team at your business" },
  { name: "shopPhotoUrl", label: "Shop / stall photo", folder: "seller-verification/shop", icon: Store, helperText: "A clear photo of your shop front or market stall" },
  { name: "identityDocumentUrl", label: "Identity document", folder: "seller-verification/identity", icon: FileText, helperText: "A valid government-issued ID (NIN, driver's licence, or passport)" },
] as const;

export function VerificationUploadForm({
  formAction,
  error,
  defaultBusinessPhotoUrl,
  defaultShopPhotoUrl,
  defaultIdentityDocumentUrl,
  submitLabel = "Submit for review",
  secondaryAction,
}: VerificationUploadFormProps) {
  const defaults: Record<string, string | undefined> = {
    businessPhotoUrl: defaultBusinessPhotoUrl,
    shopPhotoUrl: defaultShopPhotoUrl,
    identityDocumentUrl: defaultIdentityDocumentUrl,
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <div className="flex items-start gap-3 rounded-xl bg-accent/10 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
          <p className="text-sm text-foreground">
            Verified stores rank higher in search, appear when buyers filter for verified sellers only, and build more
            trust at checkout. Reviewed within 48 hours.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {FIELDS.map((field) => (
              <div key={field.name} className="flex flex-col items-center gap-2 text-center">
                <field.icon className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                <ImageUploadField
                  name={field.name}
                  label={field.label}
                  folder={field.folder}
                  helperText={field.helperText}
                  defaultUrl={defaults[field.name]}
                  required
                />
              </div>
            ))}
          </div>

          <FormError message={error} />

          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
            {secondaryAction}
            <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
