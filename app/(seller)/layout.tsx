import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";

const SELLER_NAV = [{ label: "Dashboard", href: ROUTES.seller.dashboard }];

export default function SellerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Seller" items={SELLER_NAV} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
