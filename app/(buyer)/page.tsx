import { APP_NAME } from "@/lib/constants/app";

export default function MarketplaceHomePage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        Discover fashion, the {APP_NAME} way.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Africa&apos;s bend-down-select culture, reimagined as a premium digital marketplace.
      </p>
    </div>
  );
}
