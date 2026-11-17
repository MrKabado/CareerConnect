import { Skeleton, SkeletonRegion, SkeletonText } from "@/components/ui/skeleton";

export default function EmployerMessagesSkeleton() {
  return (
    <SkeletonRegion className="grid min-h-[min(700px,calc(100dvh-16rem))] flex-1 grid-cols-[minmax(270px,360px)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[#e5eeec] bg-white shadow-[0_8px_24px_rgba(34,66,65,0.06)] max-[760px]:grid-cols-1" label="Loading messages">
      <aside className="flex min-h-0 flex-col border-r border-[#edf1f1] bg-white">
        <div className="space-y-3 border-b border-[#edf1f1] p-4">
          <Skeleton className="h-10 w-full" shape="rect" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16" shape="rect" />
            <Skeleton className="h-7 w-20" shape="rect" />
            <Skeleton className="h-7 w-24" shape="rect" />
          </div>
        </div>
        <div className="space-y-3 p-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="flex items-center gap-3 rounded-xl border border-[#edf1f1] bg-white p-3" key={index}>
              <Skeleton className="h-10 w-10" shape="circle" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-[60%]" shape="line" />
                <Skeleton className="h-2.5 w-[80%]" shape="line" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col bg-[#fbfdfc]">
        <header className="flex items-center gap-3 border-b border-[#edf1f1] px-5 py-4">
          <Skeleton className="h-10 w-10" shape="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-52" shape="line" />
            <Skeleton className="h-2.5 w-40" shape="line" />
          </div>
        </header>

        <div className="flex-1 space-y-4 p-5">
          <SkeletonText lines={4} />
        </div>

        <div className="border-t border-[#edf1f1] p-4">
          <Skeleton className="h-12 w-full" shape="rect" />
        </div>
      </section>
    </SkeletonRegion>
  );
}
