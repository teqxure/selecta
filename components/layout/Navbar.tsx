import Link from "next/link";
import { Search, ShoppingBag, LogOut, Bell } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/app/(auth)/actions";
import { getUnreadNotificationCount } from "@/services/notifications/notification.service";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export async function Navbar() {
  const user = await currentUser();
  const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Logo className="shrink-0" />

        <form action={ROUTES.search} method="GET" className="hidden max-w-sm flex-1 md:block">
          <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-muted/60 px-4 text-sm text-muted-foreground transition-colors focus-within:border-accent/50 focus-within:bg-background">
            <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
            <input
              name="q"
              placeholder="Search dresses, sneakers, bags…"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-6 text-sm font-medium md:flex">
          <Link href={ROUTES.search} className="text-foreground/80 transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link href={ROUTES.seller.root} className="text-foreground/80 transition-colors hover:text-foreground">
            Sell
          </Link>
          {user && (
            <Link href={ROUTES.saved} className="text-foreground/80 transition-colors hover:text-foreground">
              Saved
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3 md:ml-0">
          {user ? (
            <>
              <Link
                href={ROUTES.notifications}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-4.5 w-4.5" strokeWidth={2} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-accent" />
                )}
              </Link>
              <Link
                href={ROUTES.cart}
                aria-label="Cart"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <ShoppingBag className="h-4.5 w-4.5" strokeWidth={2} />
              </Link>
              <Link
                href={ROUTES.profile}
                className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 transition-colors hover:bg-muted"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {user.firstName.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-foreground">{user.firstName}</span>
              </Link>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm" aria-label="Log out" className="px-2">
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href={ROUTES.login} className="text-sm font-medium text-foreground/80 hover:text-foreground">
                Log in
              </Link>
              <Link href={ROUTES.register}>
                <Button variant="accent" size="sm">
                  Start Selecting
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
