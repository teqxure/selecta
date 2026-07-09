import type { ReactNode } from "react";
import { LayoutGrid, Package, ShoppingCart, Wallet, Store, Users, MessageCircle, BarChart3, Rocket, Megaphone, ShieldCheck } from "lucide-react";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { findSellerProfileByUserId } from "@/services/sellers/seller.service";
import { Role, ROLE_LABELS } from "@/lib/constants/roles";
import { env } from "@/lib/env";

const iconProps = { className: "h-4 w-4", strokeWidth: 2 } as const;

const SELLER_NAV_GROUPS: DashboardNavGroup[] = [
  { items: [{ label: "Dashboard", href: ROUTES.seller.dashboard, icon: <LayoutGrid {...iconProps} /> }] },
  {
    label: "Selling",
    items: [
      { label: "Products", href: ROUTES.seller.products, icon: <Package {...iconProps} /> },
      { label: "Orders", href: ROUTES.seller.orders, icon: <ShoppingCart {...iconProps} /> },
      { label: "Customers", href: ROUTES.seller.customers, icon: <Users {...iconProps} /> },
      { label: "Messages", href: ROUTES.seller.messages, icon: <MessageCircle {...iconProps} /> },
    ],
  },
  {
    label: "Growth & finance",
    items: [
      { label: "Analytics", href: ROUTES.seller.analytics, icon: <BarChart3 {...iconProps} /> },
      { label: "Growth Center", href: ROUTES.seller.growth, icon: <Rocket {...iconProps} /> },
      { label: "Marketing Center", href: ROUTES.seller.marketing, icon: <Megaphone {...iconProps} /> },
      { label: "Wallet", href: ROUTES.seller.wallet, icon: <Wallet {...iconProps} /> },
    ],
  },
  {
    label: "Store",
    items: [
      { label: "Store settings", href: ROUTES.seller.settings, icon: <Store {...iconProps} /> },
      { label: "Verification", href: ROUTES.seller.verification, icon: <ShieldCheck {...iconProps} /> },
    ],
  },
];

export default async function SellerLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  const profile = user?.role === Role.SELLER ? await findSellerProfileByUserId(user.id) : null;

  // Still mid-onboarding: show a plain, focused shell — the dashboard nav
  // (products/orders/wallet) is meaningless before a store exists.
  if (user?.role === Role.SELLER && !profile?.onboardingCompletedAt) {
    return <div className="mx-auto flex min-h-full max-w-2xl flex-1 items-center justify-center px-6">{children}</div>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      {user && (
        <DashboardSidebar
          subtitle="Seller Studio"
          groups={SELLER_NAV_GROUPS}
          user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, roleLabel: ROLE_LABELS[user.role] }}
          marketplaceUrl={env.NEXT_PUBLIC_APP_URL}
        />
      )}
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
