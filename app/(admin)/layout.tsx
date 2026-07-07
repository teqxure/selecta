import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ROUTES } from "@/lib/constants/routes";

const ADMIN_NAV = [
  { label: "Command Center", href: ROUTES.admin.root },
  { label: "Users", href: ROUTES.admin.users },
  { label: "Sellers", href: ROUTES.admin.sellers },
  { label: "Verification queue", href: ROUTES.admin.verificationQueue },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <DashboardSidebar title="Admin" items={ADMIN_NAV} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
