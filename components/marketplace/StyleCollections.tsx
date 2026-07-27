import Link from "next/link";
import { Church, Briefcase, Sun, Zap, type LucideIcon } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { STYLE_COLLECTIONS } from "@/lib/constants/style-collections";

const COLLECTION_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  church: { icon: Church, className: "bg-[color:var(--color-midnight)] text-white" },
  corporate: { icon: Briefcase, className: "bg-accent text-accent-foreground" },
  weekend: { icon: Sun, className: "bg-[color:var(--color-olive-sage)] text-[color:var(--color-cream)]" },
  street: { icon: Zap, className: "bg-[color:var(--color-gold)] text-[color:var(--color-midnight)]" },
};

/** Icon + color-block tiles, not photography — a curated entry point into search shouldn't promise a specific look no single photo can represent. */
export function StyleCollections() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STYLE_COLLECTIONS.map((collection) => {
        const style = COLLECTION_STYLE[collection.query];
        const Icon = style.icon;
        return (
          <Link
            key={collection.label}
            href={`${ROUTES.search}?q=${encodeURIComponent(collection.query)}`}
            className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] ${style.className}`}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition-transform duration-500 ease-out group-hover:scale-110" aria-hidden />
            <Icon className="relative h-6 w-6 opacity-90" strokeWidth={1.75} />
            <span className="relative font-display text-base font-semibold leading-tight sm:text-lg">{collection.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
