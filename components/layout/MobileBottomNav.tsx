import Link from "next/link";
import { Home, Search, PlusCircle, Heart, User } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";

/**
 * App-like fixed bottom nav for phones — most Selecta traffic is mobile.
 * Desktop keeps the full Navbar; this is `md:hidden`. Deliberately no
 * active-route highlighting (Navbar doesn't have it either) to keep this a
 * server-rendered component with no client-side pathname tracking needed.
 */
export async function MobileBottomNav() {
  const user = await currentUser();

  const items = [
    { label: "Home", href: ROUTES.home, icon: Home },
    { label: "Explore", href: ROUTES.search, icon: Search },
    { label: "Sell", href: ROUTES.seller.root, icon: PlusCircle },
    { label: "Saved", href: user ? ROUTES.saved : ROUTES.login, icon: Heart },
    { label: "Profile", href: user ? ROUTES.profile : ROUTES.login, icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-around px-2 py-1.5" style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}>
        {items.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-muted-foreground transition-colors active:text-accent"
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
