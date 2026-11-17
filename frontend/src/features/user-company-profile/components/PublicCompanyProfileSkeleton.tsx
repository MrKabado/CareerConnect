import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function PublicCompanyProfileSkeleton() {
  return (
    <SkeletonRegion className="min-h-screen bg-[#f5f8f8]" label="Loading company profile">
      <div className="mx-auto w-full max-w-[1136px] px-6 py-5 max-[680px]:px-4 max-[680px]:py-4">
        <div className="mb-5 rounded-[18px] border border-[#e6efee] bg-white p-5 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonText lines={2} />
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-[18px]" />
            <Skeleton className="h-40 w-full rounded-[18px]" />
            <Skeleton className="h-40 w-full rounded-[18px]" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-24 w-full rounded-[18px]" />
            <Skeleton className="h-28 w-full rounded-[18px]" />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
