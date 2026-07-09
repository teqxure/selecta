"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Stepper } from "@/components/ui/Stepper";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const STEP_SEGMENTS = ["images", "details", "pricing", "location", "review"] as const;
const STEP_LABELS = ["Photos", "Details", "Pricing", "Location", "Review"];

function BackToProducts() {
  return (
    <Link href={ROUTES.seller.products} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" strokeWidth={2} />
      Back to products
    </Link>
  );
}

export function StepNav({ productId, isDraft }: { productId: string; isDraft: boolean }) {
  const segment = useSelectedLayoutSegment();
  const currentIndex = STEP_SEGMENTS.indexOf((segment as (typeof STEP_SEGMENTS)[number]) ?? "images");

  if (isDraft) {
    return (
      <div className="flex flex-col gap-3">
        <BackToProducts />
        <Stepper steps={STEP_LABELS} currentStep={currentIndex + 1} />
      </div>
    );
  }

  const tabs = [
    { label: "Photos", href: ROUTES.seller.productImages(productId) },
    { label: "Details", href: ROUTES.seller.productDetails(productId) },
    { label: "Pricing", href: ROUTES.seller.productPricing(productId) },
    { label: "Location", href: ROUTES.seller.productLocation(productId) },
  ];

  return (
    <div className="flex flex-col gap-3">
      <BackToProducts />
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
    </div>
  );
}
