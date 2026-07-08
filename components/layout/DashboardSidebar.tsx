"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowLeftCircle, ChevronUp, LogOut, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/ui/Logo";

export interface DashboardNavItem {
  label: string;
  href: string;
  /** A rendered icon element (e.g. `<Users className="h-4 w-4" />`), not a component reference — this crosses the server/client boundary as JSX, not a function. */
  icon?: ReactNode;
}

export interface DashboardNavGroup {
  /** Omit for a lone, ungrouped item at the top (e.g. "Overview") — no uppercase heading is rendered for it. */
  label?: string;
  items: DashboardNavItem[];
}

interface DashboardSidebarProps {
  /** Shown under the wordmark, e.g. "HQ" or "Seller Studio". */
  subtitle: string;
  groups: DashboardNavGroup[];
  user: { firstName: string; lastName: string; email: string; roleLabel: string };
  /**
   * Absolute URL to the marketplace's own home page — always absolute,
   * never a relative `/`, because this dashboard can be served from its
   * own subdomain (e.g. admin.selectapick.store), where a relative `/`
   * would just reload the dashboard itself instead of leaving it.
   */
  marketplaceUrl: string;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, onNavigate }: { item: DashboardNavItem; pathname: string; onNavigate: () => void }) {
  const active = isActivePath(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground/70 transition-colors hover:bg-muted hover:text-secondary-foreground",
        active && "bg-muted text-secondary-foreground",
      )}
    >
      {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
      {item.icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
      {item.label}
    </Link>
  );
}

function NavGroups({ groups, pathname, onNavigate }: { groups: DashboardNavGroup[]; pathname: string; onNavigate: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-2">
      {groups.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{group.label}</p>
          )}
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function ProfileMenu({ user }: { user: DashboardSidebarProps["user"] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-xl border border-border bg-secondary shadow-[var(--shadow-card-hover)]">
          <Link
            href={ROUTES.profile}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-secondary-foreground/80 transition-colors hover:bg-muted hover:text-secondary-foreground"
          >
            <UserCircle className="h-4 w-4" strokeWidth={2} />
            Account settings
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-secondary-foreground/80 transition-colors hover:bg-muted hover:text-secondary-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Log out
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {user.firstName.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-secondary-foreground">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{user.roleLabel}</span>
        </span>
        <ChevronUp className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}

function SidebarFooter({ user, marketplaceUrl }: { user: DashboardSidebarProps["user"]; marketplaceUrl: string }) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-4">
      <Link
        href={marketplaceUrl}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground/70 transition-colors hover:bg-muted hover:text-secondary-foreground"
      >
        <ArrowLeftCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
        Back to Marketplace
      </Link>
      <ProfileMenu user={user} />
    </div>
  );
}

function SidebarLogo({ subtitle, marketplaceUrl }: { subtitle: string; marketplaceUrl: string }) {
  return (
    <div className="px-6 pb-4 pt-6">
      <Logo href={marketplaceUrl} />
      <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Shared dashboard shell for the admin console and the seller studio — grouped nav, working active-state, a profile menu, and a way back to the marketplace on every screen size. */
export function DashboardSidebar({ subtitle, groups, user, marketplaceUrl }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Close the drawer whenever the route changes — adjusted during render
  // (React's recommended pattern) rather than in an effect, so there's no
  // extra render pass just to close it.
  const [drawerPathname, setDrawerPathname] = useState(pathname);
  if (pathname !== drawerPathname) {
    setDrawerPathname(pathname);
    setDrawerOpen(false);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-secondary px-4 py-3 md:hidden">
        <Logo href={marketplaceUrl} />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary-foreground/80 hover:bg-muted"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-secondary shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6">
              <Logo href={marketplaceUrl} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary-foreground/80 hover:bg-muted"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <p className="px-6 pb-4 pt-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{subtitle}</p>
            <NavGroups groups={groups} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <SidebarFooter user={user} marketplaceUrl={marketplaceUrl} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-secondary md:flex">
        <SidebarLogo subtitle={subtitle} marketplaceUrl={marketplaceUrl} />
        <NavGroups groups={groups} pathname={pathname} onNavigate={() => {}} />
        <SidebarFooter user={user} marketplaceUrl={marketplaceUrl} />
      </aside>
    </>
  );
}
