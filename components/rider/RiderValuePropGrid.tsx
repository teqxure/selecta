import { Wallet, CalendarClock, Bike, LifeBuoy } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

const BENEFITS = [
  {
    icon: Wallet,
    title: "Weekly payouts",
    description: "Your earnings settle to your wallet automatically — withdraw whenever you want.",
    bg: "bg-[color:var(--color-midnight)]",
    fg: "text-white",
    iconBg: "bg-white/10",
  },
  {
    icon: CalendarClock,
    title: "Your own hours",
    description: "Go available when it suits you, go offline when it doesn't. No shifts, no minimums.",
    bg: "bg-accent",
    fg: "text-white",
    iconBg: "bg-white/15",
  },
  {
    icon: Bike,
    title: "Any vehicle",
    description: "Bicycle, motorbike, car, or van — sign up with whatever you already have.",
    bg: "bg-[color:var(--color-olive-sage)]",
    fg: "text-[color:var(--color-cream)]",
    iconBg: "bg-white/10",
  },
  {
    icon: LifeBuoy,
    title: "Real support",
    description: "A dispatch team behind every delivery, and a straightforward path to get verified.",
    bg: "bg-[color:var(--color-gold)]",
    fg: "text-[color:var(--color-midnight)]",
    iconBg: "bg-[color:var(--color-midnight)]/10",
  },
];

export function RiderValuePropGrid() {
  return (
    <FadeIn className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Why ride with Selecta</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Built for flexible income</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {BENEFITS.map(({ icon: Icon, title, description, bg, fg, iconBg }) => (
          <div key={title} className={`flex flex-col gap-4 rounded-3xl p-6 shadow-[var(--shadow-card)] sm:p-8 ${bg} ${fg}`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconBg}`}>
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">{title}</p>
              <p className="mt-1.5 text-sm opacity-80">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
