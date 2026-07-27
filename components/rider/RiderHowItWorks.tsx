import { FadeIn } from "@/components/motion/FadeIn";

const STEPS = [
  {
    number: "01",
    title: "Sign up",
    description: "Create your account and tell us about your vehicle — takes about two minutes.",
  },
  {
    number: "02",
    title: "Get verified",
    description: "Upload an ID and a photo of your vehicle. Most riders are approved within 48 hours.",
  },
  {
    number: "03",
    title: "Go available & earn",
    description: "Toggle available from your dashboard, accept nearby deliveries, and get paid.",
  },
];

export function RiderHowItWorks() {
  return (
    <FadeIn className="flex flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Getting started</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">How it works</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="flex flex-col gap-2 rounded-2xl border border-border bg-secondary p-6">
            <span className="font-display text-3xl font-semibold text-accent">{step.number}</span>
            <p className="font-display text-lg font-semibold text-foreground">{step.title}</p>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </FadeIn>
  );
}
