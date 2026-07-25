import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { STYLE_COLLECTIONS } from "@/lib/constants/style-collections";

export interface StyleCollectionsProps {
  /** Preview image per collection, resolved server-side (real listing photo, or curated fallback). */
  images: Record<string, string>;
}

export function StyleCollections({ images }: StyleCollectionsProps) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
      {STYLE_COLLECTIONS.map((collection) => (
        <Link
          key={collection.label}
          href={`${ROUTES.search}?q=${encodeURIComponent(collection.query)}`}
          className="group relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)] sm:w-44"
        >
          <Image
            src={images[collection.query]}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 144px, 176px"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-midnight/70 via-midnight/5 to-transparent" />
          <span className="absolute bottom-3 left-3 right-3 font-display text-sm font-semibold text-white">
            {collection.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
