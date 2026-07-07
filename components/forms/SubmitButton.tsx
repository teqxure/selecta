"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

/**
 * Must be rendered inside a <form action={...}> — `useFormStatus` reads the
 * nearest parent form's pending state, so this can't be the same component
 * that renders the <form> itself.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? "Please wait…" : children}
    </Button>
  );
}
