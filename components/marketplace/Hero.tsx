import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { RotatingImage } from "@/components/marketplace/RotatingImage";
import { HeroCTASwitcher } from "@/components/marketplace/HeroCTASwitcher";

export interface HeroProps {
  activeListingCount: number;
  verifiedSellerCount: number;
  locationLabel: string;
  floatingImages: string[];
}

export function Hero({ activeListingCount, verifiedSellerCount, locationLabel, floatingImages }: HeroProps) {
  return (
    <section className="bg-grain relative overflow-hidden bg-primary text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_15%,rgba(201,97,35,0.18),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-12 md:py-24">
        <div className="md:col-span-7">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Nigeria&rsquo;s marketplace for pre-loved fashion
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-xs font-medium text-primary-foreground/80">
              <MapPin className="h-3 w-3" strokeWidth={2} />
              {locationLabel}
            </span>
          </FadeIn>

          <HeroCTASwitcher />

          <FadeIn delay={0.32}>
            <div className="mt-10 flex items-center gap-5 text-sm text-primary-foreground/70 sm:gap-6">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" strokeWidth={2} />
                <strong className="font-display font-semibold text-primary-foreground">
                  {activeListingCount.toLocaleString()}
                </strong>{" "}
                fresh finds
              </span>
              <span className="h-8 w-px shrink-0 bg-primary-foreground/15" aria-hidden />
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

        {floatingImages.length > 0 && (
          <FadeIn delay={0.2} className="relative hidden h-[420px] overflow-hidden rounded-3xl shadow-[var(--shadow-float)] md:col-span-5 md:block md:h-[480px]">
            <RotatingImage images={floatingImages} intervalMs={5000} sizes="(min-width: 768px) 40vw, 100vw" />
          </FadeIn>
        )}
      </div>
    </section>
  );
}
