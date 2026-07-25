import Link from "next/link";
import { ShieldAlert, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export interface VerificationStatusBannerProps {
  /** Caller should only render this when status isn't already "VERIFIED". */
  verificationStatus: string;
  hasSubmission: boolean;
  reviewNotes?: string | null;
}

/**
 * Shown on every step of the product listing wizard (not just the final
 * "Submit for review" click) so an unverified seller knows up front —
 * they can still build and save a draft, just can't publish it yet.
 */
export function VerificationStatusBanner({ verificationStatus, hasSubmission, reviewNotes }: VerificationStatusBannerProps) {
  if (verificationStatus === "REJECTED") {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-foreground">Your last verification wasn&rsquo;t approved</p>
              <p className="text-xs text-muted-foreground">
                {reviewNotes ? `${reviewNotes} ` : ""}You can keep editing this listing, but you&rsquo;ll need to resubmit before it can be published.
              </p>
            </div>
          </div>
          <Link href={ROUTES.seller.verification}>
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
            <p className="text-sm font-medium text-foreground">Your store verification is under review</p>
            <p className="text-xs text-muted-foreground">
              Keep building this listing — it&rsquo;ll be ready to submit as soon as your store is approved.
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
            <p className="text-sm font-medium text-foreground">Verify your store before you publish</p>
            <p className="text-xs text-muted-foreground">
              You can build and save this listing now, but you&rsquo;ll need to verify your store before it can be submitted for review.
            </p>
          </div>
        </div>
        <Link href={ROUTES.seller.verification}>
          <Button variant="accent" size="sm">
            Verify now
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
