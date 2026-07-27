import { ChevronDown } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";

const FAQS = [
  {
    question: "What documents do I need?",
    answer:
      "A valid government-issued ID (NIN, driver's licence, or passport), and a photo of your vehicle. If you ride a motorbike, car, or van, you'll also need a driving license.",
  },
  {
    question: "How long does approval take?",
    answer: "Most riders hear back within 48 hours of submitting their documents.",
  },
  {
    question: "What vehicles are accepted?",
    answer: "Bicycle, motorbike, car, or van — pick whichever you already have when you sign up.",
  },
  {
    question: "How do I get paid?",
    answer: "Earnings settle to your Selecta wallet as deliveries complete. Withdraw to your bank account whenever you want.",
  },
  {
    question: "Do I have to work set hours?",
    answer: "No — toggle yourself available or offline from your dashboard whenever suits you. There are no shifts or minimums.",
  },
];

export function RiderFAQAccordion() {
  return (
    <FadeIn className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Good to know</p>
        <h2 className="font-display mt-1 text-2xl font-semibold text-foreground sm:text-3xl">Frequently asked questions</h2>
      </div>
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
