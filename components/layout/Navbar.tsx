import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { APP_NAME } from "@/lib/constants/app";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={ROUTES.home} className="text-lg font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href={ROUTES.seller.root} className="text-foreground/80 hover:text-foreground">
            Sell on {APP_NAME}
          </Link>
          <Link href={ROUTES.login} className="text-foreground/80 hover:text-foreground">
            Log in
          </Link>
        </nav>
      </div>
    </header>
  );
}
