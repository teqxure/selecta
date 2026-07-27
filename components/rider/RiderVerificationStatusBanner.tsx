import Link from "next/link";
import { ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export interface RiderVerificationStatusBannerProps {
  /** Caller should only render this when status isn't already "VERIFIED". */
  verificationStatus: string;
  hasSubmission: boolean;
  reviewNotes?: string | null;
}

/** Mirrors VerificationStatusBanner (sellers) — shown on the rider dashboard until verificationStatus is VERIFIED. */
export function RiderVerificationStatusBanner({ verificationStatus, hasSubmission, reviewNotes }: RiderVerificationStatusBannerProps) {
  if (verificationStatus === "REJECTED") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-foreground">Your last verification wasn&rsquo;t approved</p>
              <p className="text-xs text-muted-foreground">
                {reviewNotes ? `${reviewNotes} ` : ""}Resubmit your documents to be reviewed again.
              </p>
            </div>
          </div>
          <Link href={ROUTES.rider.onboarding.verification}>
            <Button variant="accent" size="sm">
              Resubmit
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (hasSubmission) {
    return (
      <Card className="border-border bg-secondary/60">
        <CardContent className="flex items-start gap-3 p-4">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-foreground">Your rider verification is under review</p>
            <p className="text-xs text-muted-foreground">
              You&rsquo;ll be able to go available and receive deliveries as soon as you&rsquo;re approved.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-foreground">Verify your account to start delivering</p>
            <p className="text-xs text-muted-foreground">Submit your documents so Selecta can approve you as a rider.</p>
          </div>
        </div>
        <Link href={ROUTES.rider.onboarding.verification}>
          <Button variant="accent" size="sm">
            Verify now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
