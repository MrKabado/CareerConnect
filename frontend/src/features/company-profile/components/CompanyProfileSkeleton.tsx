import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function CompanyProfileSkeleton() {
  return (
    <SkeletonRegion className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-8 max-[680px]:px-4" label="Loading company profile">
      <div className="space-y-6">
        <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16" shape="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-56" shape="line" />
              <Skeleton className="h-3 w-72" shape="line" />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
              <Skeleton className="mb-4 h-4 w-28" shape="line" />
              <SkeletonText lines={5} />
            </div>
            <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
              <Skeleton className="mb-4 h-4 w-28" shape="line" />
              <SkeletonText lines={5} />
            </div>
            <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
              <Skeleton className="mb-4 h-4 w-28" shape="line" />
              <SkeletonText lines={4} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
              <Skeleton className="mb-4 h-4 w-32" shape="line" />
              <SkeletonText lines={4} />
            </div>
            <div className="rounded-[22px] border border-[#e5eeeb] bg-white p-5 shadow-[0_10px_20px_rgba(20,47,47,0.02)]">
              <Skeleton className="mb-4 h-4 w-28" shape="line" />
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
