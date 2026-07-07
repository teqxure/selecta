import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { findSellerProfileByUserId } from "@/services/sellers/seller.service";
import { Role } from "@/lib/constants/roles";

const SELLER_NAV = [
  { label: "Dashboard", href: ROUTES.seller.dashboard },
  { label: "Products", href: ROUTES.seller.products },
  { label: "Orders", href: ROUTES.seller.orders },
  { label: "Wallet", href: ROUTES.seller.wallet },
  { label: "Store settings", href: ROUTES.seller.settings },
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
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Seller" items={SELLER_NAV} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
