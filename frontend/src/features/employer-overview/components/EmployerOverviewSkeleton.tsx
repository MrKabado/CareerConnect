import {
  Skeleton,
  SkeletonRegion,
  SkeletonStatCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function EmployerOverviewSkeleton() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-[1136px] flex-1 px-10 max-[920px]:px-6 max-[680px]:px-4" label="Loading employer overview">
      <div className="space-y-5 py-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" shape="line" />
          <Skeleton className="h-8 w-64" shape="line" />
          <Skeleton className="h-3 w-80" shape="line" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonStatCard key={index} />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
          <div className="rounded-[16px] border border-[#e7eeed] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]">
            <Skeleton className="mb-4 h-4 w-32" shape="line" />
            <SkeletonText lines={4} />
          </div>
          <div className="rounded-[16px] border border-[#e7eeed] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]">
            <Skeleton className="mb-4 h-4 w-32" shape="line" />
            <SkeletonText lines={5} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
