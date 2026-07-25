import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

export function ProductSection({
  eyebrow,
  title,
  subtitle,
  seeAllHref,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  children: ReactNode;
}) {
  return (
    <FadeIn className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
          <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
      {children}
    </FadeIn>
  );
}
