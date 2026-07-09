import { APP_NAME } from "@/lib/constants/app";

/**
 * Placeholder terms pending real legal review — grounded in mechanics that
 * actually exist in the platform today (escrowed payments via the order
 * state machine, wallet/ledger payouts, dispute resolution, contact-safety
 * enforcement) rather than generic boilerplate, but not a substitute for
 * counsel-reviewed terms before this goes in front of real sellers.
 */
export default function SellerAgreementPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">Seller Agreement</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {new Date().getFullYear()}</p>
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="font-medium text-foreground">1. Selling on {APP_NAME}</h2>
          <p className="mt-1 text-muted-foreground">
            By opening a store, you agree to list only items you own or are authorized to sell, describe them
            accurately (condition, size, defects), and fulfill orders promptly once payment is confirmed.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-foreground">2. Payments and payouts</h2>
          <p className="mt-1 text-muted-foreground">
            Buyers pay through {APP_NAME}&apos;s checkout. Funds are held until the order is marked delivered (or the
            dispute window passes without issue), then become available for withdrawal from your seller wallet, less
            {APP_NAME}&apos;s commission for the item&apos;s category.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-foreground">3. Stay on platform</h2>
          <p className="mt-1 text-muted-foreground">
            All buyer communication, negotiation, and payment must happen inside {APP_NAME}. Directing a buyer to pay
            outside the platform, or repeatedly sharing personal contact details in messages to route around it,
            voids buyer protection on that order and may result in a warning, messaging restriction, or account
            suspension.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-foreground">4. Disputes and returns</h2>
          <p className="mt-1 text-muted-foreground">
            If a buyer opens a dispute, you&apos;ll be notified and can respond directly in the conversation thread.
            {APP_NAME} reviews unresolved disputes and may refund the buyer, release funds to you, or split the
            outcome based on the evidence provided.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-foreground">5. Account standing</h2>
          <p className="mt-1 text-muted-foreground">
            Your store&apos;s trust score reflects completed sales, response time, review quality, and dispute rate.
            {APP_NAME} may restrict or suspend a store that repeatedly violates these terms, regardless of sales
            volume.
          </p>
        </section>

        <section>
          <h2 className="font-medium text-foreground">6. Changes</h2>
          <p className="mt-1 text-muted-foreground">
            {APP_NAME} may update this agreement as the platform evolves. Continuing to sell after an update means
            you accept the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
