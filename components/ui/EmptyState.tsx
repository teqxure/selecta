import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

/** Every empty state should feel like Selecta, not like an error message. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <p className="font-display text-lg font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Link href={action.href}>
          <Button variant="accent" size="sm" className="mt-1">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}
