import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function UserApplicationsSkeleton() {
  return (
    <SkeletonRegion className="min-h-screen bg-[#f5f8f8]" label="Loading applications">
      <div className="mx-auto w-full max-w-[1136px] px-6 pt-8 pb-10 max-[680px]:px-4 max-[680px]:pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <SkeletonText lines={2} className="w-64" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="mb-5 flex gap-3">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-[18px]" />
            <Skeleton className="h-20 w-full rounded-[18px]" />
            <Skeleton className="h-20 w-full rounded-[18px]" />
          </div>
          <Skeleton className="h-[22rem] w-full rounded-[18px]" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
