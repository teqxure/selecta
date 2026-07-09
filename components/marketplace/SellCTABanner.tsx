import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { ROUTES } from "@/lib/constants/routes";

export function SellCTABanner() {
  return (
    <FadeIn className="bg-grain relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 sm:py-20">
      <h2 className="font-display mx-auto max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
        Turn your closet into cash
      </h2>
      <p className="mx-auto mt-4 max-w-md text-primary-foreground/70">
        List in minutes, reach buyers across Nigeria, and get paid safely — no store, no upfront cost.
      </p>
      <div className="mt-8 flex justify-center">
        <Link href={ROUTES.register}>
          <Button variant="accent" size="lg">
            Start Selling
          </Button>
        </Link>
      </div>
      <p className="mt-5 text-xs text-primary-foreground/50">Free to list · Verified payouts · Join in minutes</p>
    </FadeIn>
  );
}
