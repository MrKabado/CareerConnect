import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function ApplicantDetailSkeleton() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-280 flex-1 px-10 py-6 max-[920px]:px-6 max-[680px]:px-4" label="Loading applicant details">
      <div className="space-y-6 pb-8">
        <Skeleton className="h-4 w-24" shape="line" />

        <div className="rounded-[18px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14" shape="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-52" shape="line" />
              <Skeleton className="h-3 w-72" shape="line" />
            </div>
          </div>
        </div>

        <div className="h-16 rounded-[18px] border border-[#e5eeeb] bg-white p-4 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
          <Skeleton className="h-4 w-56" shape="line" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <div className="rounded-[18px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
              <Skeleton className="mb-4 h-4 w-32" shape="line" />
              <SkeletonText lines={5} />
            </div>
            <div className="rounded-[18px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
              <Skeleton className="mb-4 h-4 w-32" shape="line" />
              <SkeletonText lines={5} />
            </div>
          </div>

          <div className="space-y-5 rounded-[18px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_22px_rgba(24,52,52,0.03)]">
            <Skeleton className="h-4 w-32" shape="line" />
            <SkeletonText lines={5} />
            <Skeleton className="h-11 w-full" shape="rect" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
