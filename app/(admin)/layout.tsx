import type { ReactNode } from "react";
import { LayoutDashboard, Users, Store, ShieldCheck, Package, FolderTree } from "lucide-react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";

const ADMIN_NAV = [
  { label: "Command Center", href: ROUTES.admin.root, icon: LayoutDashboard },
  { label: "Users", href: ROUTES.admin.users, icon: Users },
  { label: "Sellers", href: ROUTES.admin.sellers, icon: Store },
  { label: "Verification queue", href: ROUTES.admin.verificationQueue, icon: ShieldCheck },
  { label: "Products", href: ROUTES.admin.products, icon: Package },
  { label: "Categories", href: ROUTES.admin.categories, icon: FolderTree },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Selecta HQ" items={ADMIN_NAV} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
