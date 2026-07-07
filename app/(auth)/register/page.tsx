"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthActionState } from "@/app/(auth)/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { ROUTES } from "@/lib/constants/routes";

const initialState: AuthActionState = {};

export default function RegisterPage() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
          </div>
          <Input name="email" type="email" label="Email" required />
          <Input name="password" type="password" label="Password" required />
          <FormError message={state.error} />
          <SubmitButton className="w-full">Create account</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={ROUTES.login} className="font-medium text-accent">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
