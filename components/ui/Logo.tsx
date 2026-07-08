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
 * The Selecta wordmark (public/Selecta.png) is white-on-transparent, so it
 * always sits on its own dark-charcoal chip — that's what makes it drop
 * onto any background in the app (light navbar, dark sidebar, footer,
 * auth pages) without needing a second logo asset for light surfaces.
 */
export function Logo({ href = ROUTES.home, className, imageClassName }: LogoProps) {
  return (
    <Link href={href} className={cn("inline-flex items-center rounded-lg bg-midnight px-3 py-1.5", className)}>
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
