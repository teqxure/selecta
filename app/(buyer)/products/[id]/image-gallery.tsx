"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MediaItem = { id: string; type: "image"; url: string } | { id: string; type: "video"; url: string };

export function ImageGallery({
  images,
  videoUrl,
  title,
}: {
  images: { id: string; url: string }[];
  videoUrl?: string | null;
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const media: MediaItem[] = [
    ...images.map((image) => ({ id: image.id, type: "image" as const, url: image.url })),
    ...(videoUrl ? [{ id: "video", type: "video" as const, url: videoUrl }] : []),
  ];
  const active = media[activeIndex];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              {active.type === "video" ? (
                <video src={active.url} controls playsInline preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <Image src={active.url} alt={title} fill priority className="object-cover" />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {media.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {media.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                index === activeIndex ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {item.type === "video" ? (
                <>
                  <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-5 w-5 text-white" fill="white" strokeWidth={0} />
                  </span>
                </>
              ) : (
                <Image src={item.url} alt="" fill className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
