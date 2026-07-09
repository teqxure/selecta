import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPendingGoogleSignupToken } from "@/lib/auth/google";
import { PENDING_GOOGLE_SIGNUP_COOKIE_NAME } from "@/lib/constants/app";
import { ROUTES } from "@/lib/constants/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { finalizeGoogleSignupAction } from "./actions";

export default async function WelcomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PENDING_GOOGLE_SIGNUP_COOKIE_NAME)?.value;
  const profile = token ? await verifyPendingGoogleSignupToken(token) : null;
  if (!profile) redirect(ROUTES.register);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">Welcome to Selecta, {profile.firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">What would you like to do?</p>
      </div>

      <form action={finalizeGoogleSignupAction.bind(null, "BUYER")}>
        <Card hoverable className="cursor-pointer">
          <CardHeader>
            <CardTitle>Shop on Selecta</CardTitle>
            <CardDescription>Discover products and buy from trusted sellers.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <SubmitButton variant="accent" className="w-full">
              Shop on Selecta
            </SubmitButton>
          </CardContent>
        </Card>
      </form>

      <form action={finalizeGoogleSignupAction.bind(null, "SELLER")}>
        <Card hoverable className="cursor-pointer">
          <CardHeader>
            <CardTitle>Sell on Selecta</CardTitle>
            <CardDescription>Create a store and start selling.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <SubmitButton variant="outline" className="w-full">
              Sell on Selecta
            </SubmitButton>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
