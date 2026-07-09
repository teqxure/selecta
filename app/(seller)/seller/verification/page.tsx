import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireRole } from "@/lib/auth/rbac";
import { Role } from "@/lib/constants/roles";
import { getSellerProfileByUserId } from "@/services/sellers/seller.service";
import { Card, CardContent } from "@/components/ui/Card";
import { VerificationForm } from "./form";

export default async function SellerVerificationPage() {
  const session = await requireRole(Role.SELLER);
  const profile = await getSellerProfileByUserId(session.userId);
  const verification = profile.verification;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Store verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few photos so our team can confirm your store is real. Reviewed within 48 hours.
        </p>
      </div>

      {verification?.status === "VERIFIED" && (
        <Card className="border-[color:var(--color-olive-sage)]/40 bg-[color:var(--color-olive-sage)]/10">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[color:var(--color-olive-sage)]" strokeWidth={2} />
            <p className="text-sm font-medium text-foreground">Your store is verified.</p>
          </CardContent>
        </Card>
      )}

      {verification?.status === "PENDING" && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 p-5">
            <Clock className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
            <p className="text-sm font-medium text-foreground">
              Your documents are under review. We&apos;ll notify you once they&apos;ve been checked — usually within 48 hours.
            </p>
          </CardContent>
        </Card>
      )}

      {verification?.status === "REJECTED" && (
        <>
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="flex items-start gap-3 p-5">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
              <div>
                <p className="text-sm font-medium text-foreground">Your last submission wasn&apos;t approved.</p>
                {verification.reviewNotes && <p className="mt-1 text-sm text-muted-foreground">{verification.reviewNotes}</p>}
                <p className="mt-1 text-sm text-muted-foreground">Update the photos below and resubmit.</p>
              </div>
            </CardContent>
          </Card>
          <VerificationForm
            defaultBusinessPhotoUrl={verification.businessPhotoUrl ?? undefined}
            defaultShopPhotoUrl={verification.shopPhotoUrl ?? undefined}
            defaultIdentityDocumentUrl={verification.identityDocumentUrl ?? undefined}
          />
        </>
      )}

      {!verification && <VerificationForm />}
    </div>
  );
}
