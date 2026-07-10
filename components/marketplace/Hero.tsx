import { MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { FloatingCard } from "@/components/marketplace/FloatingCard";
import { RotatingImage } from "@/components/marketplace/RotatingImage";
import { HeroCTASwitcher } from "@/components/marketplace/HeroCTASwitcher";

export interface HeroProps {
  activeListingCount: number;
  verifiedSellerCount: number;
  locationLabel: string;
  floatingImages: string[];
}

/** Splits the flat image list into one slice per floating card so each card cycles through a distinct set of photos. */
function chunk(images: string[], size: number, count: number): string[][] {
  return Array.from({ length: count }, (_, i) => images.slice(i * size, i * size + size)).filter((slice) => slice.length > 0);
}

export function Hero({ activeListingCount, verifiedSellerCount, locationLabel, floatingImages }: HeroProps) {
  const [slotA, slotB, slotC] = chunk(floatingImages, 3, 3);

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

          <HeroCTASwitcher />

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
          {slotA?.length > 0 && (
            <FloatingCard className="left-4 top-0 h-56 w-40 rotate-[-6deg]" delay={0}>
              <RotatingImage images={slotA} intervalMs={4500} sizes="160px" />
            </FloatingCard>
          )}
          {slotB?.length > 0 && (
            <FloatingCard className="right-0 top-10 h-64 w-44 rotate-[5deg]" delay={0.3}>
              <RotatingImage images={slotB} intervalMs={5500} sizes="176px" />
            </FloatingCard>
          )}
          {slotC?.length > 0 && (
            <FloatingCard className="bottom-0 left-16 h-52 w-40 rotate-[3deg]" delay={0.6}>
              <RotatingImage images={slotC} intervalMs={6500} sizes="160px" />
            </FloatingCard>
          )}
        </div>
      </div>
    </section>
  );
}
