import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Store,
  ShieldCheck,
  Package,
  FolderTree,
  Settings,
  Plug,
  Percent,
  Flag,
  Banknote,
  Gavel,
  LineChart,
  ClipboardList,
} from "lucide-react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";

const ADMIN_NAV = [
  { label: "Command Center", href: ROUTES.admin.root, icon: LayoutDashboard },
  { label: "Users", href: ROUTES.admin.users, icon: Users },
  { label: "Sellers", href: ROUTES.admin.sellers, icon: Store },
  { label: "Verification queue", href: ROUTES.admin.verificationQueue, icon: ShieldCheck },
  { label: "Products", href: ROUTES.admin.products, icon: Package },
  { label: "Categories", href: ROUTES.admin.categories, icon: FolderTree },
  { label: "Orders", href: ROUTES.admin.orders, icon: ClipboardList },
  { label: "Finance", href: ROUTES.admin.finance, icon: LineChart },
  { label: "Withdrawals", href: ROUTES.admin.withdrawals, icon: Banknote },
  { label: "Disputes", href: ROUTES.admin.disputes, icon: Gavel },
  { label: "Commissions", href: ROUTES.admin.commissions, icon: Percent },
  { label: "Integrations", href: ROUTES.admin.integrations, icon: Plug },
  { label: "Feature flags", href: ROUTES.admin.featureFlags, icon: Flag },
  { label: "Settings", href: ROUTES.admin.settings, icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Selecta HQ" items={ADMIN_NAV} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
