"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const MODES = {
  buy: {
    label: "Buy",
    headline: "Your next favorite fit is already out there.",
    subtext: "Discover quality fashion finds from trusted sellers around you.",
    cta: "Start Selecting",
    href: ROUTES.search,
  },
  sell: {
    label: "Sell",
    headline: "Turn your closet into your next paycheck.",
    subtext: "List in minutes, reach buyers across Nigeria, and get paid safely.",
    cta: "Start Selling",
    href: ROUTES.register,
  },
} as const;

type Mode = keyof typeof MODES;

export function HeroCTASwitcher() {
  const [mode, setMode] = useState<Mode>("buy");
  const active = MODES[mode];

  return (
    <div>
      <FadeIn>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/60">What are you looking for?</p>
        <div className="mt-3 inline-flex rounded-full border border-primary-foreground/20 bg-primary-foreground/5 p-1">
          {(Object.keys(MODES) as Mode[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                "min-w-20 rounded-full px-5 py-2 text-sm font-medium transition-colors",
                mode === key ? "bg-accent text-accent-foreground" : "text-primary-foreground/70 hover:text-primary-foreground",
              )}
            >
              {MODES[key].label}
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={0.08}>
        <h1 className="font-display mt-6 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
          {active.headline}
        </h1>
      </FadeIn>

      <FadeIn delay={0.16}>
        <p className="mt-5 max-w-md text-lg text-primary-foreground/70">{active.subtext}</p>
      </FadeIn>

      <FadeIn delay={0.24}>
        <div className="mt-8">
          <Link href={active.href}>
            <Button variant="accent" size="lg">
              {active.cta}
            </Button>
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
