import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function JobSearchSkeleton() {
  return (
    <SkeletonRegion className="min-h-screen bg-[#f5f8f8]" label="Loading job search">
      <div className="mx-auto w-full max-w-[1136px] px-6 pt-8 pb-12 max-[680px]:px-4 max-[680px]:pt-5">
        <div className="mb-7 rounded-[18px] border border-[#e6efee] bg-white p-5 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
          <div className="mb-4 flex gap-3">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <div className="grid gap-7 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-[#e6efee] bg-white p-4 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
            <Skeleton className="mb-4 h-5 w-20 rounded-full" />
            <Skeleton className="mb-3 h-10 w-full rounded-lg" />
            <Skeleton className="mb-3 h-10 w-full rounded-lg" />
            <Skeleton className="mb-3 h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-[18px]" />
            <Skeleton className="h-28 w-full rounded-[18px]" />
            <Skeleton className="h-28 w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
