import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeaturedStatCardProps {
  label: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  tone?: "accent" | "midnight" | "olive" | "gold";
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<FeaturedStatCardProps["tone"]>, string> = {
  accent: "bg-accent text-accent-foreground",
  midnight: "bg-[color:var(--color-midnight)] text-white",
  olive: "bg-[color:var(--color-olive-sage)] text-[color:var(--color-cream)]",
  gold: "bg-[color:var(--color-gold)] text-[color:var(--color-midnight)]",
};

const ICON_BG: Record<NonNullable<FeaturedStatCardProps["tone"]>, string> = {
  accent: "bg-white/15",
  midnight: "bg-white/10",
  olive: "bg-white/10",
  gold: "bg-[color:var(--color-midnight)]/10",
};

/**
 * The "hero" tile in a bento-style stat grid — one headline metric gets a
 * saturated color block and larger type, breaking up what would otherwise
 * be a monotonous row of identical cards. Meant to be paired with regular
 * StatCards for the supporting numbers, not used alone.
 */
export function FeaturedStatCard({ label, value, description, icon: Icon, tone = "accent", className }: FeaturedStatCardProps) {
  return (
    <div className={cn("relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 shadow-[var(--shadow-card)] sm:p-7", TONE_CLASSES[tone], className)}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
      {Icon && (
        <span className={cn("relative flex h-10 w-10 items-center justify-center rounded-full", ICON_BG[tone])}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </span>
      )}
      <div className="relative mt-4">
        <p className="text-sm opacity-80">{label}</p>
        <p className="font-display mt-1 text-3xl font-semibold leading-tight sm:text-4xl">{value}</p>
        {description && <p className="mt-1.5 text-xs opacity-70">{description}</p>}
      </div>
    </div>
  );
}
