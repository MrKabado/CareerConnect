import {
  Skeleton,
  SkeletonRegion,
  SkeletonStatCard,
} from "@/components/ui/skeleton";

export default function EmployerJobListingsSkeleton() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-[1136px] flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4 max-[680px]:py-5" label="Loading job listings">
      <div className="space-y-5">
        <div className="space-y-3 rounded-[22px] border border-[#edf1f1] bg-white p-5 shadow-[0_8px_24px_rgba(34,66,65,0.05)]">
          <Skeleton className="h-3 w-32" shape="line" />
          <Skeleton className="h-9 w-60" shape="line" />
          <Skeleton className="h-3 w-80" shape="line" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonStatCard key={index} />
          ))}
        </div>

        <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" shape="line" />
              <Skeleton className="h-2.5 w-28" shape="line" />
            </div>
            <Skeleton className="h-8 w-28" shape="rect" />
          </div>

          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div className="grid gap-3 rounded-xl border border-[#edf1f1] bg-white p-3 sm:grid-cols-4" key={rowIndex}>
                <Skeleton className="h-3 w-[80%]" shape="line" />
                <Skeleton className="h-3 w-full" shape="line" />
                <Skeleton className="h-3 w-full" shape="line" />
                <Skeleton className="h-3 w-[60%]" shape="line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
