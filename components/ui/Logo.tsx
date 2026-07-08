import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/lib/constants/routes";

interface LogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
}

/**
 * The Selecta wordmark (public/Selecta.png) is white-on-transparent, so on
 * a light background it needs a dark-charcoal chip behind it — the
 * approved brand treatment (see the "black background" mockup in
 * public/) for a dark backdrop. In dark mode the page/sidebar background
 * is already dark, so the chip is dropped rather than stacking two
 * near-identical dark tones (midnight-on-near-midnight had almost no
 * contrast, which read as "broken" rather than as a deliberate chip).
 */
export function Logo({ href = ROUTES.home, className, imageClassName }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center rounded-lg bg-midnight px-3 py-1.5 dark:bg-transparent dark:px-0 dark:py-0", className)}
    >
      <Image
        src="/Selecta.png"
        alt="Selecta"
        width={364}
        height={99}
        priority
        className={cn("h-5 w-auto", imageClassName)}
      />
    </Link>
  );
}
