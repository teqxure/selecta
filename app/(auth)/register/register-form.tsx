"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction, type AuthActionState } from "@/app/(auth)/actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FormError } from "@/components/forms/FormError";
import { GoogleAuthButton, AuthDivider } from "@/components/auth/GoogleAuthButton";
import { ROUTES } from "@/lib/constants/routes";
import { PUBLIC_REGISTER_ROLES } from "@/lib/validators/auth";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

const ROLE_COPY: Record<(typeof PUBLIC_REGISTER_ROLES)[number], { label: string; description: string }> = {
  BUYER: { label: "I'm shopping", description: "Discover fashion from verified sellers" },
  SELLER: { label: "I'm selling", description: "Bring your store online" },
};

interface RegisterFormProps {
  googleEnabled: boolean;
}

export function RegisterForm({ googleEnabled }: RegisterFormProps) {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [role, setRole] = useState<(typeof PUBLIC_REGISTER_ROLES)[number]>("BUYER");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Join Selecta as a buyer or start selling your own store.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
            {PUBLIC_REGISTER_ROLES.map((option) => (
              <label
                key={option}
                className={cn(
                  "cursor-pointer rounded-xl border border-border px-3 py-2.5 text-center transition-colors",
                  role === option ? "border-accent bg-accent/10" : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold text-foreground">{ROLE_COPY[option].label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{ROLE_COPY[option].description}</span>
              </label>
            ))}
          </div>

          {googleEnabled && (
            <>
              <GoogleAuthButton role={role} />
              <AuthDivider />
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name" required />
          </div>
          <Input name="email" type="email" label="Email" required />
          <Input name="phone" type="tel" label="Phone number" placeholder="0801 234 5678" required />
          <Input name="password" type="password" label="Password" required />
          <Input name="confirmPassword" type="password" label="Confirm password" required />
          <FormError message={state.error} />
          <SubmitButton className="w-full">
            {role === "SELLER" ? "Create seller account" : "Create account"}
          </SubmitButton>
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
