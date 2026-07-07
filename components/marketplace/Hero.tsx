import Image from "next/image";
import Link from "next/link";
import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FadeIn } from "@/components/motion/FadeIn";
import { FloatingCard } from "@/components/marketplace/FloatingCard";
import { ROUTES } from "@/lib/constants/routes";

export interface HeroProps {
  activeListingCount: number;
  verifiedSellerCount: number;
  locationLabel: string;
  floatingImages: string[];
}

export function Hero({ activeListingCount, verifiedSellerCount, locationLabel, floatingImages }: HeroProps) {
  return (
    <section className="bg-grain relative overflow-hidden bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-7">
          <FadeIn>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium text-primary-foreground/80">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {locationLabel}
            </span>
          </FadeIn>

          <FadeIn delay={0.08}>
            <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Your next favorite fit is already out there.
            </h1>
          </FadeIn>

          <FadeIn delay={0.16}>
            <p className="mt-5 max-w-md text-lg text-primary-foreground/70">
              Discover quality fashion finds from trusted sellers around you.
            </p>
          </FadeIn>

          <FadeIn delay={0.24}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={ROUTES.search}>
                <Button variant="accent" size="lg">
                  Start Selecting
                </Button>
              </Link>
              <Link href={ROUTES.register}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Become a Seller
                </Button>
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.32}>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} />
                <strong className="font-display font-semibold text-primary-foreground">
                  {activeListingCount.toLocaleString()}
                </strong>{" "}
                fresh finds in {locationLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={2} />
                <strong className="font-display font-semibold text-primary-foreground">
                  {verifiedSellerCount.toLocaleString()}
                </strong>{" "}
                verified sellers
              </span>
            </div>
          </FadeIn>
        </div>

        <div className="relative hidden h-[420px] md:col-span-5 md:block">
          {floatingImages[0] && (
            <FloatingCard className="left-4 top-0 h-56 w-40 rotate-[-6deg]" delay={0}>
              <Image src={floatingImages[0]} alt="" fill className="object-cover" sizes="160px" />
            </FloatingCard>
          )}
          {floatingImages[1] && (
            <FloatingCard className="right-0 top-10 h-64 w-44 rotate-[5deg]" delay={0.3}>
              <Image src={floatingImages[1]} alt="" fill className="object-cover" sizes="176px" />
            </FloatingCard>
          )}
          {floatingImages[2] && (
            <FloatingCard className="bottom-0 left-16 h-52 w-40 rotate-[3deg]" delay={0.6}>
              <Image src={floatingImages[2]} alt="" fill className="object-cover" sizes="160px" />
            </FloatingCard>
          )}
        </div>
      </div>
    </section>
  );
}
