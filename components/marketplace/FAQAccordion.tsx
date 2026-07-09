import { ChevronDown } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

const FAQS = [
  {
    question: "How does buyer protection work?",
    answer:
      "Your payment is held securely by Selecta until you confirm your order has arrived as described. If something's wrong, you can open a dispute before releasing payment to the seller.",
  },
  {
    question: "Are all sellers verified?",
    answer:
      "Sellers can display a verified badge once they've completed identity verification. We show verification status clearly on every store and listing so you know who you're buying from.",
  },
  {
    question: "What if there's a problem with my order?",
    answer:
      "Open a dispute directly from your order page. Our team reviews the evidence from both sides and helps resolve it — your payment stays protected until then.",
  },
  {
    question: "How do I become a seller?",
    answer:
      "Create an account, complete your store profile, and list your first item. You can start selling right away, with a reminder to complete verification to unlock full seller features.",
  },
  {
    question: "Is delivery available nationwide?",
    answer:
      "Yes — sellers ship across Nigeria, and you can also filter listings by city to find sellers near you for faster delivery or local pickup.",
  },
];

export function FAQAccordion() {
  return (
    <FadeIn className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-center text-xl font-semibold text-foreground sm:text-2xl">
        Frequently asked questions
      </h2>
      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-secondary">
        {FAQS.map(({ question, answer }) => (
          <details key={question} className="group px-5 py-4 first:rounded-t-2xl last:rounded-b-2xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-secondary-foreground marker:content-none">
              {question}
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={2} />
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{answer}</p>
          </details>
        ))}
      </div>
    </FadeIn>
  );
}
