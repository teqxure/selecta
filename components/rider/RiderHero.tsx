import Link from "next/link";
import { Bike, Wallet, Clock } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export interface RiderHeroProps {
  activeRiderCount: number;
  completedDeliveryCount: number;
}

export function RiderHero({ activeRiderCount, completedDeliveryCount }: RiderHeroProps) {
  return (
    <section className="bg-grain relative overflow-hidden bg-primary text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_15%,rgba(201,97,35,0.18),transparent_70%)]" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center md:py-28">
        <FadeIn>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Deliver with Selecta</p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <h1 className="font-display mt-4 max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Earn on your own schedule
          </h1>
        </FadeIn>

        <FadeIn delay={0.16}>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/70 sm:text-lg">
            Bicycle, motorbike, car, or van — bring whatever you&rsquo;ve got. Go available whenever suits you, get matched
            with nearby deliveries, and get paid out weekly.
          </p>
        </FadeIn>

        <FadeIn delay={0.24}>
          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Link href={ROUTES.register}>
              <Button variant="accent" size="lg">
                Sign up to ride
              </Button>
            </Link>
            <Link href={ROUTES.login}>
              <Button variant="outline" size="lg" className="border-primary-foreground/25 text-primary-foreground hover:bg-white/10">
                Log in
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.32}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-sm text-primary-foreground/70 sm:gap-6">
            <span className="flex items-center gap-1.5">
              <Bike className="h-4 w-4 text-accent" strokeWidth={2} />
              <strong className="font-display font-semibold text-primary-foreground">{activeRiderCount.toLocaleString()}</strong> active
              riders
            </span>
            <span className="h-8 w-px shrink-0 bg-primary-foreground/15" aria-hidden />
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-accent" strokeWidth={2} />
              Weekly payouts
            </span>
            <span className="h-8 w-px shrink-0 bg-primary-foreground/15" aria-hidden />
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-accent" strokeWidth={2} />
              {completedDeliveryCount > 0 ? `${completedDeliveryCount.toLocaleString()} deliveries made` : "Flexible hours"}
            </span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
