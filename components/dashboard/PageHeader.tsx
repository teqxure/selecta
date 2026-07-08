import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Small label above the title, e.g. "Selecta HQ" or "Seller Studio". Omit when breadcrumbs are provided — they already anchor the page. */
  eyebrow?: string;
  breadcrumbs?: Breadcrumb[];
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** The consistent header every dashboard page should open with — breadcrumbs so nobody feels trapped, a clear title, and a slot for the page's primary actions. */
export function PageHeader({ eyebrow, breadcrumbs, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={2} />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
