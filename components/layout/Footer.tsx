import { APP_NAME } from "@/lib/constants/app";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-8">
        <p className="font-display text-sm font-medium text-foreground">
          {APP_NAME}
          <span className="text-accent">.</span> — No more bending. Just selecting.
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
