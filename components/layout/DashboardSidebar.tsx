import Link from "next/link";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  label: string;
  href: string;
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
      <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium text-secondary-foreground/80 hover:bg-muted",
            activeHref === item.href && "bg-muted text-secondary-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
