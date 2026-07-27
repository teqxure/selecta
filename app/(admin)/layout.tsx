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
  Bell,
  Search,
  Rocket,
  Wallet2,
  Sparkles,
  BrainCircuit,
  ShieldAlert,
  MapPinned,
  Truck,
  SlidersHorizontal,
  Map,
  Star,
  Tag,
  LayoutGrid,
  Megaphone,
  FileClock,
  ReceiptText,
  FileStack,
  FileCheck,
  Navigation,
  Bike,
  Undo2,
  Ticket,
  Radar,
  KeyRound,
} from "lucide-react";
import { DashboardSidebar, type DashboardNavGroup } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";
import { currentUser } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/permissions";
import { Role, ROLE_LABELS } from "@/lib/constants/roles";
import { env } from "@/lib/env";

/**
 * `permission: null` means "any admin, no specific grant required"
 * (dashboard overview). `permission: "SUPER_ADMIN_ONLY"` is a sentinel for
 * platform-control pages Super Admin never delegates. This only decides
 * what's *shown* — the actual pages/actions re-check with
 * requireRole/requirePermission server-side regardless, since a hidden
 * link is not a security boundary.
 */
const ADMIN_NAV_GROUPS = [
  {
    items: [{ label: "Command Center", href: ROUTES.admin.root, icon: LayoutDashboard, permission: null }],
  },
  {
    label: "Marketplace Operations Center",
    items: [
      { label: "Products", href: ROUTES.admin.products, icon: Package, permission: "products.moderate" },
      { label: "Categories", href: ROUTES.admin.categories, icon: FolderTree, permission: "content.manage" },
      { label: "Sellers", href: ROUTES.admin.sellers, icon: Store, permission: "vendors.manage" },
      { label: "Orders", href: ROUTES.admin.orders, icon: ClipboardList, permission: "orders.manage" },
      { label: "Featured products", href: ROUTES.admin.marketplaceFeatured, icon: Star, permission: "MANAGE_PRODUCTS" },
      { label: "Coupons", href: ROUTES.admin.marketplaceCoupons, icon: Tag, permission: "CREATE_PROMOTIONS" },
      { label: "Collections", href: ROUTES.admin.marketplaceCollections, icon: LayoutGrid, permission: "CREATE_PROMOTIONS" },
      { label: "Campaigns", href: ROUTES.admin.marketplaceCampaigns, icon: Megaphone, permission: "CREATE_PROMOTIONS" },
    ],
  },
  {
    label: "Finance Center",
    items: [
      { label: "Finance", href: ROUTES.admin.finance, icon: LineChart, permission: "VIEW_FINANCE" },
      { label: "Revenue", href: ROUTES.admin.revenue, icon: Wallet2, permission: "VIEW_FINANCE" },
      { label: "Withdrawals", href: ROUTES.admin.withdrawals, icon: Banknote, permission: "payouts.manage" },
      { label: "Commissions", href: ROUTES.admin.commissions, icon: Percent, permission: "SUPER_ADMIN_ONLY" },
      { label: "Settlements", href: ROUTES.admin.financeSettlements, icon: ReceiptText, permission: "VIEW_FINANCE" },
      { label: "Audit log", href: ROUTES.admin.financeAuditLog, icon: FileClock, permission: "SUPER_ADMIN_ONLY" },
      { label: "Plans", href: ROUTES.admin.plans, icon: Rocket, permission: "SUPER_ADMIN_ONLY" },
      { label: "Growth partners", href: ROUTES.admin.growthPartners, icon: Sparkles, permission: "SUPER_ADMIN_ONLY" },
    ],
  },
  {
    label: "Compliance Center",
    items: [
      { label: "Verification queue", href: ROUTES.admin.verificationQueue, icon: ShieldCheck, permission: "vendors.verify" },
      { label: "Document types", href: ROUTES.admin.complianceDocumentTypes, icon: FileStack, permission: "SUPER_ADMIN_ONLY" },
      { label: "Documents", href: ROUTES.admin.complianceDocuments, icon: FileCheck, permission: "VERIFY_DOCUMENTS" },
    ],
  },
  {
    label: "Logistics Operations Center",
    items: [
      { label: "Dispatch", href: ROUTES.admin.logisticsDispatch, icon: Navigation, permission: "ASSIGN_RIDERS" },
      { label: "Riders", href: ROUTES.admin.logisticsRiders, icon: Bike, permission: "MANAGE_LOGISTICS" },
      { label: "Rider withdrawals", href: ROUTES.admin.logisticsRiderWithdrawals, icon: Banknote, permission: "MANAGE_LOGISTICS" },
      { label: "Delivery zones", href: ROUTES.admin.logisticsZones, icon: MapPinned, permission: "SUPER_ADMIN_ONLY" },
      { label: "City pricing", href: ROUTES.admin.logisticsPricing, icon: SlidersHorizontal, permission: "SUPER_ADMIN_ONLY" },
      { label: "Logistics partners", href: ROUTES.admin.logisticsPartners, icon: Truck, permission: "SUPER_ADMIN_ONLY" },
      { label: "Delivery rules", href: ROUTES.admin.logisticsRules, icon: Settings, permission: "SUPER_ADMIN_ONLY" },
      { label: "Delivery heat map", href: ROUTES.admin.logisticsHeatMap, icon: Map, permission: "SUPER_ADMIN_ONLY" },
    ],
  },
  {
    label: "Customer Experience Center",
    items: [
      { label: "Disputes", href: ROUTES.admin.disputes, icon: Gavel, permission: "disputes.handle" },
      { label: "Returns", href: ROUTES.admin.returns, icon: Undo2, permission: "APPROVE_REFUNDS" },
      { label: "Support tickets", href: ROUTES.admin.supportTickets, icon: Ticket, permission: "support.messages" },
      { label: "Reviews", href: ROUTES.admin.reviews, icon: Star, permission: "content.manage" },
      { label: "Trust & Safety", href: ROUTES.admin.trustDashboard, icon: ShieldAlert, permission: "support.messages" },
    ],
  },
  {
    label: "Intelligence Center",
    items: [
      { label: "Intelligence", href: ROUTES.admin.intelligence, icon: Radar, permission: "VIEW_ANALYTICS" },
      { label: "Marketplace intelligence", href: ROUTES.admin.marketplaceIntelligence, icon: BrainCircuit, permission: "VIEW_ANALYTICS" },
      { label: "Search analytics", href: ROUTES.admin.searchAnalytics, icon: Search, permission: "VIEW_ANALYTICS" },
    ],
  },
  {
    label: "Permission Engine",
    items: [
      { label: "Staff roles", href: ROUTES.admin.roles, icon: KeyRound, permission: "SUPER_ADMIN_ONLY" },
      { label: "Admins", href: ROUTES.admin.admins, icon: UserCog, permission: "SUPER_ADMIN_ONLY" },
      { label: "Users", href: ROUTES.admin.users, icon: Users, permission: "users.manage" },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Integrations", href: ROUTES.admin.integrations, icon: Plug, permission: "SUPER_ADMIN_ONLY" },
      { label: "Notifications", href: ROUTES.admin.notifications, icon: Bell, permission: "SUPER_ADMIN_ONLY" },
      { label: "Feature flags", href: ROUTES.admin.featureFlags, icon: Flag, permission: "SUPER_ADMIN_ONLY" },
      { label: "Settings", href: ROUTES.admin.settings, icon: Settings, permission: "SUPER_ADMIN_ONLY" },
    ],
  },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) redirect(ROUTES.login);

  const canSee = (permission: string | null) => {
    if (permission === null) return true;
    if (permission === "SUPER_ADMIN_ONLY") return user.role === Role.SUPER_ADMIN;
    return hasPermission(user, permission);
  };

  const visibleGroups: DashboardNavGroup[] = ADMIN_NAV_GROUPS.map((group) => ({
    label: "label" in group ? group.label : undefined,
    items: group.items
      .filter((item) => canSee(item.permission))
      .map((item) => ({
        label: item.label,
        href: item.href,
        icon: <item.icon className="h-4 w-4" strokeWidth={2} />,
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <DashboardSidebar
        subtitle="Selecta HQ"
        groups={visibleGroups}
        user={{ firstName: user.firstName, lastName: user.lastName, email: user.email, roleLabel: ROLE_LABELS[user.role] }}
        marketplaceUrl={env.NEXT_PUBLIC_APP_URL}
      />
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
