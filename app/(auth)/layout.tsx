import type { ReactNode } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { APP_NAME } from "@/lib/constants/app";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-secondary px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href={ROUTES.home} className="mb-8 block text-center text-lg font-semibold text-foreground">
          {APP_NAME}
        </Link>
        {children}
      </div>
    </div>
  );
}
