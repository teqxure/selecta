"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/app/(auth)/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { ROUTES } from "@/lib/constants/routes";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Password" required />
          <FormError message={state.error} />
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
