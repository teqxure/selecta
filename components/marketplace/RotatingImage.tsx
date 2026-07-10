"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Slow crossfade + Ken-Burns zoom cycle through a handful of real product
 * photos — a lightweight, no-asset stand-in for a hero video. Each instance
 * should get its own `images` slice and `intervalMs` so multiple cards on
 * the same page drift out of sync rather than flipping in unison.
 */
export function RotatingImage({
  images,
  intervalMs = 4500,
  sizes,
}: {
  images: string[];
  intervalMs?: number;
  sizes: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => clearInterval(id);
  }, [images, intervalMs]);

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key={images[index]}
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1 }}
        animate={{ opacity: 1, scale: 1.08 }}
        exit={{ opacity: 0 }}
        transition={{ opacity: { duration: 1 }, scale: { duration: intervalMs / 1000 + 1, ease: "linear" } }}
      >
        <Image src={images[index]} alt="" fill className="object-cover" sizes={sizes} />
      </motion.div>
    </AnimatePresence>
  );
}
