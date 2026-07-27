import type { ReactNode } from "react";
import { LayoutGrid, Wallet, History, Banknote, Settings, LogOut } from "lucide-react";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/layout/DashboardSidebar";
import { Logo } from "@/components/ui/Logo";
import { Footer } from "@/components/layout/Footer";
import { logoutAction } from "@/app/(auth)/actions";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { findRiderProfileByUserId } from "@/services/logistics/rider.service";
import { Role, ROLE_LABELS } from "@/lib/constants/roles";
import { env } from "@/lib/env";

const iconProps = { className: "h-4 w-4", strokeWidth: 2 } as const;

const RIDER_NAV_GROUPS: DashboardNavGroup[] = [
  { items: [{ label: "Deliveries", href: ROUTES.rider.dashboard, icon: <LayoutGrid {...iconProps} /> }] },
  {
    items: [
      { label: "History", href: ROUTES.rider.history, icon: <History {...iconProps} /> },
      { label: "Wallet", href: ROUTES.rider.wallet, icon: <Wallet {...iconProps} /> },
      { label: "Withdrawals", href: ROUTES.rider.withdrawals, icon: <Banknote {...iconProps} /> },
    ],
  },
  { items: [{ label: "Settings", href: ROUTES.rider.settings, icon: <Settings {...iconProps} /> }] },
];

export default async function RiderLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const profile = user?.role === Role.RIDER ? await findRiderProfileByUserId(user.id) : null;

  // Still mid-onboarding: a bare shell with just a way out — the dashboard
  // nav (deliveries/wallet) is meaningless before verification is even
  // submitted. Mirrors the same branch in app/(seller)/layout.tsx.
  if (user?.role === Role.RIDER && !profile?.onboardingCompletedAt) {
    return (
      <div className="theme-light flex min-h-full flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Logo href={env.NEXT_PUBLIC_APP_URL} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Log out
            </button>
          </form>
        </div>
        <div className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-6">{children}</div>
      </div>
    );
  }

  return (
    <div className="theme-light flex min-h-full flex-1 flex-col md:flex-row">
      {user && user.role === Role.RIDER && (
        <DashboardSidebar
          subtitle="Rider"
          groups={RIDER_NAV_GROUPS}
          user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, roleLabel: ROLE_LABELS[user.role] }}
          marketplaceUrl={env.NEXT_PUBLIC_APP_URL}
        />
      )}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-5 md:p-8">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
