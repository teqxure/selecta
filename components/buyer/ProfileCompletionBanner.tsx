import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { ROUTES } from "@/lib/constants/routes";
import { dismissProfileNudgeAction } from "@/app/(buyer)/profile/actions";

export function ProfileCompletionBanner() {
  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Add a phone number and delivery address</p>
          <p className="text-xs text-muted-foreground">Speeds up checkout and helps sellers reach you about your orders.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={ROUTES.profile} className="text-sm font-medium text-accent hover:underline">
            Complete profile
          </Link>
          <form action={dismissProfileNudgeAction}>
            <SubmitButton variant="ghost" size="sm">
              Dismiss
            </SubmitButton>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
