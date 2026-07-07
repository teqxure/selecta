import { Skeleton, ProductGridSkeleton } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      <div className="bg-primary px-6 py-16 md:py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <Skeleton className="h-6 w-32 bg-primary-foreground/10" />
          <Skeleton className="h-14 w-full max-w-lg bg-primary-foreground/10" />
          <Skeleton className="h-5 w-full max-w-sm bg-primary-foreground/10" />
          <div className="flex gap-3">
            <Skeleton className="h-12 w-40 rounded-full bg-primary-foreground/10" />
            <Skeleton className="h-12 w-40 rounded-full bg-primary-foreground/10" />
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <ProductGridSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
