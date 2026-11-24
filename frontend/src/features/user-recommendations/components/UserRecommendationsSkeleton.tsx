import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function UserRecommendationsSkeleton() {
  return (
    <SkeletonRegion className="min-h-screen bg-[#f5f8f8]" label="Loading recommendations">
      <div className="mx-auto w-full max-w-[1136px] px-10 pt-7 pb-8 max-[920px]:px-6 max-[680px]:px-4">
        <div className="mb-6 rounded-[18px] border border-[#e6efee] bg-white p-5 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
          <SkeletonText lines={2} />
          <div className="mt-5 flex flex-wrap gap-3">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>

        <div className="mb-5 flex items-end justify-between gap-4">
          <SkeletonText lines={2} className="w-64" />
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-[18px]" />
          <Skeleton className="h-28 w-full rounded-[18px]" />
          <Skeleton className="h-28 w-full rounded-[18px]" />
        </div>
      </div>
    </SkeletonRegion>
  );
}
