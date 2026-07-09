import { ShieldCheck, BadgeCheck, MessageCircle, MapPin } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Buyer protection",
    description: "Payment is held securely until you confirm your order arrived as described.",
    bg: "bg-[color:var(--color-midnight)]",
    fg: "text-white",
    iconBg: "bg-white/10",
  },
  {
    icon: BadgeCheck,
    title: "Verified sellers",
    description: "Every verified badge means a real seller who's passed our identity checks.",
    bg: "bg-accent",
    fg: "text-white",
    iconBg: "bg-white/15",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging",
    description: "Ask about fit, condition, or delivery — chat with sellers without leaving Selecta.",
    bg: "bg-[color:var(--color-olive-sage)]",
    fg: "text-[color:var(--color-cream)]",
    iconBg: "bg-white/10",
  },
  {
    icon: MapPin,
    title: "Local discovery",
    description: "Find sellers near you for faster delivery and easier pickup.",
    bg: "bg-[color:var(--color-gold)]",
    fg: "text-[color:var(--color-midnight)]",
    iconBg: "bg-[color:var(--color-midnight)]/10",
  },
];

export function ValuePropGrid() {
  return (
    <FadeIn className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">Why shop on Selecta</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Built for safe, easy secondhand fashion shopping</p>
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
