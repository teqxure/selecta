"use client";

import { type InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={visible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={cn(
              "h-11 w-full rounded-lg border border-border bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground",
              "transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:ring-offset-1 focus:ring-offset-background",
              error && "border-red-500 focus:ring-red-500",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            tabIndex={-1}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {visible ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-sm text-red-600">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
