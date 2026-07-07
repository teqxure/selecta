import { Skeleton } from "@/components/ui/Skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
