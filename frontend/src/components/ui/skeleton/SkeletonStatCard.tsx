import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonStatCardProps = {
  className?: string;
};

export default function SkeletonStatCard({ className }: SkeletonStatCardProps) {
  return (
    <article
      className={cn(
        "rounded-[16px] border border-[#edf1f1] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]",
        className,
      )}
    >
      <Skeleton className="mb-3 h-3 w-16" shape="line" />
      <Skeleton className="h-7 w-20" shape="line" />
      <div className="mt-3">
        <Skeleton className="h-2.5 w-24" shape="line" />
      </div>
    </article>
  );
}
