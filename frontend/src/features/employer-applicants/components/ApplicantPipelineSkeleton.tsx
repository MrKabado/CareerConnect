import {
  Skeleton,
  SkeletonRegion,
  SkeletonStatCard,
} from "@/components/ui/skeleton";

export default function ApplicantPipelineSkeleton() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-284 flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:py-5" label="Loading applicants pipeline">
      <div className="space-y-5">
        <div className="space-y-3 pb-3">
          <Skeleton className="h-3 w-24" shape="line" />
          <Skeleton className="h-8 w-48" shape="line" />
          <Skeleton className="h-3 w-80" shape="line" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonStatCard key={index} />
          ))}
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#e5eeeb] bg-white shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
          <div className="flex flex-col gap-3 border-b border-[#e7efee] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" shape="line" />
              <Skeleton className="h-2.5 w-32" shape="line" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" shape="rect" />
              <Skeleton className="h-9 w-28" shape="rect" />
            </div>
          </div>

          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="flex items-center gap-3 rounded-xl border border-[#edf1f1] bg-white p-3" key={index}>
                <Skeleton className="h-11 w-11" shape="circle" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" shape="line" />
                  <Skeleton className="h-2.5 w-56" shape="line" />
                </div>
                <Skeleton className="h-8 w-24" shape="rect" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
