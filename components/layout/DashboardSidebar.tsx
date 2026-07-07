import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

interface DashboardSidebarProps {
  title: string;
  items: DashboardNavItem[];
  activeHref?: string;
}

/** Shared shell for both the seller dashboard and the admin command center. */
export function DashboardSidebar({ title, items, activeHref }: DashboardSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col gap-1 border-r border-border bg-secondary px-4 py-6">
      <p className="font-display mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground/70 transition-colors hover:bg-muted hover:text-secondary-foreground",
              isActive && "bg-muted text-secondary-foreground",
            )}
          >
            {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />}
            {item.icon && <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />}
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
