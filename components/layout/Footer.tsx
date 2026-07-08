import { APP_NAME } from "@/lib/constants/app";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8">
        <Logo />
        <p className="text-sm text-muted-foreground">No more bending. Just selecting.</p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
