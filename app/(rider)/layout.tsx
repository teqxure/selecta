import type { ReactNode } from "react";
import { LayoutGrid, Wallet } from "lucide-react";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/layout/DashboardSidebar";
import { Footer } from "@/components/layout/Footer";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { Role, ROLE_LABELS } from "@/lib/constants/roles";
import { env } from "@/lib/env";

const iconProps = { className: "h-4 w-4", strokeWidth: 2 } as const;

const RIDER_NAV_GROUPS: DashboardNavGroup[] = [
  { items: [{ label: "Deliveries", href: ROUTES.rider.dashboard, icon: <LayoutGrid {...iconProps} /> }] },
  { items: [{ label: "Wallet", href: ROUTES.rider.wallet, icon: <Wallet {...iconProps} /> }] },
];

export default async function RiderLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
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
