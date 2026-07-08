"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { GoogleAuthButton, AuthDivider } from "@/components/auth/GoogleAuthButton";
import { ROUTES } from "@/lib/constants/routes";

const initialState: AuthActionState = {};

interface LoginFormProps {
  googleEnabled: boolean;
  oauthError?: string;
}

export function LoginForm({ googleEnabled, oauthError }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
      </CardHeader>
      <CardContent>
        {googleEnabled && (
          <div className="mb-4 flex flex-col gap-4">
            <GoogleAuthButton />
            <AuthDivider />
          </div>
        )}
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Password" required />
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" name="rememberMe" className="h-4 w-4 rounded border-border accent-accent" />
            Remember me for 30 days
          </label>
          <FormError message={state.error ?? oauthError} />
          <SubmitButton className="w-full">Log in</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          New to Selecta?{" "}
          <Link href={ROUTES.register} className="font-medium text-accent">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
