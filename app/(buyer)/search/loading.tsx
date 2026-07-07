import { Skeleton, ProductGridSkeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <ProductGridSkeleton count={12} />
    </div>
  );
}
