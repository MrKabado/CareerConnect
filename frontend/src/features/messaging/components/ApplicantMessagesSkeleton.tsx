import { Skeleton, SkeletonRegion } from "@/components/ui/skeleton";

export default function ApplicantMessagesSkeleton() {
  return (
    <SkeletonRegion className="min-h-screen bg-[#f5f8f8]" label="Loading messages">
      <div className="mx-auto w-full max-w-[1136px] px-6 py-8 max-[680px]:px-4 max-[760px]:py-5">
        <div className="mb-6">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="mt-2 h-8 w-36 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-80 rounded-full" />
        </div>

        <div className="grid min-h-[min(680px,calc(100dvh-15rem))] grid-cols-[minmax(260px,340px)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_8px_24px_rgba(34,66,65,0.06)] max-[760px]:grid-cols-1">
          <div className="space-y-3 border-r border-[#edf1f1] p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))}
          </div>
          <div className="space-y-4 p-5">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
