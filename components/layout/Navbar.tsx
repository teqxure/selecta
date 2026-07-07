import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { APP_NAME } from "@/lib/constants/app";
import { currentUser } from "@/lib/auth/current-user";
import { logoutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";

export async function Navbar() {
  const user = await currentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href={ROUTES.home} className="text-lg font-semibold tracking-tight text-foreground">
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href={ROUTES.search} className="text-foreground/80 hover:text-foreground">
            Search
          </Link>
          <Link href={ROUTES.seller.root} className="text-foreground/80 hover:text-foreground">
            Sell on {APP_NAME}
          </Link>
          {user ? (
            <>
              <Link href={ROUTES.saved} className="text-foreground/80 hover:text-foreground">
                Saved
              </Link>
              <Link href={ROUTES.cart} className="text-foreground/80 hover:text-foreground">
                Cart
              </Link>
              <Link href={ROUTES.orders} className="text-foreground/80 hover:text-foreground">
                Orders
              </Link>
              <Link href={ROUTES.profile} className="text-foreground/80 hover:text-foreground">
                {user.firstName}
              </Link>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="sm">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <Link href={ROUTES.login} className="text-foreground/80 hover:text-foreground">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
