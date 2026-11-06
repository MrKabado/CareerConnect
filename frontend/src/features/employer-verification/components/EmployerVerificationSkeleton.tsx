import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function EmployerVerificationSkeleton() {
  return (
    <SkeletonRegion className="min-h-dvh bg-[#f5f8f8] px-4 py-10 font-sans text-[#263a3c]" label="Loading verification">
      <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-[#e5eeec] bg-white p-6 shadow-[0_8px_30px_rgba(27,54,52,0.08)] md:p-9">
        <Skeleton className="h-3 w-28" shape="line" />
        <Skeleton className="mt-3 h-7 w-52" shape="line" />
        <Skeleton className="mt-3 h-3 w-full" shape="line" />
        <Skeleton className="mt-2 h-3 w-72" shape="line" />

        <div className="mt-6 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="rounded-xl border border-[#edf1f1] bg-white p-4" key={index}>
              <Skeleton className="mb-3 h-4 w-36" shape="line" />
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[#edf1f1] bg-white p-4">
          <Skeleton className="h-3 w-32" shape="line" />
          <Skeleton className="mt-3 h-11 w-full" shape="rect" />
        </div>
      </section>
    </SkeletonRegion>
  );
}
