"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const STEP_SEGMENTS = ["images", "details", "pricing", "location", "review"] as const;
const STEP_LABELS = ["Photos", "Details", "Pricing", "Location", "Review"];

export function StepNav({ productId, isDraft }: { productId: string; isDraft: boolean }) {
  const segment = useSelectedLayoutSegment();
  const currentIndex = STEP_SEGMENTS.indexOf((segment as (typeof STEP_SEGMENTS)[number]) ?? "images");

  if (isDraft) {
    return <Stepper steps={STEP_LABELS} currentStep={currentIndex + 1} />;
  }

  const tabs = [
    { label: "Photos", href: ROUTES.seller.productImages(productId) },
    { label: "Details", href: ROUTES.seller.productDetails(productId) },
    { label: "Pricing", href: ROUTES.seller.productPricing(productId) },
    { label: "Location", href: ROUTES.seller.productLocation(productId) },
  ];

  return (
    <nav className="flex gap-2 border-b border-border pb-2">
      {tabs.map((tab, index) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium",
            index === currentIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
