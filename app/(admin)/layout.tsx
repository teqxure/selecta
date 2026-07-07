import type { ReactNode } from "react";
import { redirect } from "next/navigation";
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
  UserCog,
} from "lucide-react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/permissions";
import { Role } from "@/lib/constants/roles";

/**
 * `permission: null` means "any admin, no specific grant required"
 * (dashboard overview). `permission: "SUPER_ADMIN_ONLY"` is a sentinel for
 * platform-control pages Super Admin never delegates. This only decides
 * what's *shown* — the actual pages/actions re-check with
 * requireRole/requirePermission server-side regardless, since a hidden
 * link is not a security boundary.
 */
const ADMIN_NAV = [
  { label: "Command Center", href: ROUTES.admin.root, icon: LayoutDashboard, permission: null },
  { label: "Users", href: ROUTES.admin.users, icon: Users, permission: "users.manage" },
  { label: "Sellers", href: ROUTES.admin.sellers, icon: Store, permission: "vendors.manage" },
  { label: "Verification queue", href: ROUTES.admin.verificationQueue, icon: ShieldCheck, permission: "vendors.verify" },
  { label: "Products", href: ROUTES.admin.products, icon: Package, permission: "products.moderate" },
  { label: "Categories", href: ROUTES.admin.categories, icon: FolderTree, permission: "content.manage" },
  { label: "Orders", href: ROUTES.admin.orders, icon: ClipboardList, permission: "orders.manage" },
  { label: "Finance", href: ROUTES.admin.finance, icon: LineChart, permission: "reports.view" },
  { label: "Withdrawals", href: ROUTES.admin.withdrawals, icon: Banknote, permission: "payouts.manage" },
  { label: "Disputes", href: ROUTES.admin.disputes, icon: Gavel, permission: "disputes.handle" },
  { label: "Admins", href: ROUTES.admin.admins, icon: UserCog, permission: "SUPER_ADMIN_ONLY" },
  { label: "Commissions", href: ROUTES.admin.commissions, icon: Percent, permission: "SUPER_ADMIN_ONLY" },
  { label: "Integrations", href: ROUTES.admin.integrations, icon: Plug, permission: "SUPER_ADMIN_ONLY" },
  { label: "Feature flags", href: ROUTES.admin.featureFlags, icon: Flag, permission: "SUPER_ADMIN_ONLY" },
  { label: "Settings", href: ROUTES.admin.settings, icon: Settings, permission: "SUPER_ADMIN_ONLY" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) redirect(ROUTES.login);

  const visibleNav = ADMIN_NAV.filter((item) => {
    if (item.permission === null) return true;
    if (item.permission === "SUPER_ADMIN_ONLY") return user.role === Role.SUPER_ADMIN;
    return hasPermission(user, item.permission);
  });

  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Selecta HQ" items={visibleNav} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
