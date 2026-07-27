import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ROUTES } from "@/lib/constants/routes";

export function RiderCTABanner() {
  return (
    <FadeIn className="bg-grain relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Ready when you are</p>
      <h2 className="font-display mx-auto mt-3 max-w-xl text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">
        Start delivering today
      </h2>
      <p className="mx-auto mt-4 max-w-md text-primary-foreground/70">
        Sign up in minutes and you could be approved and earning within 48 hours.
      </p>
      <div className="mt-8 flex justify-center">
        <Link href={ROUTES.register}>
          <Button variant="accent" size="lg">
            Sign up to ride
          </Button>
        </Link>
      </div>
      <p className="mt-5 text-xs text-primary-foreground/50">Free to join · Weekly payouts · Any vehicle</p>
    </FadeIn>
  );
}
