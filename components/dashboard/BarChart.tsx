"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface BarChartDatum {
  label: string;
  value: number;
  tone?: "accent" | "muted";
}

/**
 * Deliberately not a charting library — this is a handful of proportional
 * bars, and recharts/chart.js would be a lot of bundle for that. Real
 * time-series analytics is a future-phase concern (see ProductEvent).
 */
export function BarChart({ data }: { data: BarChartDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((datum) => (
        <div key={datum.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{datum.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(datum.value / max) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("h-full rounded-full", datum.tone === "muted" ? "bg-muted-foreground/40" : "bg-accent")}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-foreground">{datum.value}</span>
        </div>
      ))}
    </div>
  );
}
