import Skeleton from "./Skeleton";
import SkeletonRegion from "./SkeletonRegion";
import SkeletonText from "./SkeletonText";

export type PageSkeletonProps = {
  className?: string;
  label?: string;
};

export default function PageSkeleton({
  className,
  label = "Loading page",
}: PageSkeletonProps) {
  return (
    <SkeletonRegion className={className} label={label}>
      <div className="mx-auto w-full max-w-[1136px] space-y-6 px-6 py-8 max-[680px]:px-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4 rounded-[18px] border border-[#e6efee] bg-white p-4 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
            <SkeletonText lines={3} />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>

          <div className="space-y-4">
            <div className="rounded-[18px] border border-[#e6efee] bg-white p-5 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
              <SkeletonText lines={2} />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            </div>

            <div className="rounded-[18px] border border-[#e6efee] bg-white p-5 shadow-[0_6px_18px_rgba(24,58,57,0.04)]">
              <SkeletonText lines={3} />
              <div className="mt-4 space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonRegion>
  );
}
