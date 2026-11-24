import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonListProps = {
  count?: number;
  className?: string;
};

export default function SkeletonList({ count = 3, className }: SkeletonListProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div className="flex items-center gap-3 rounded-xl border border-[#edf1f1] bg-white p-3" key={index}>
          <Skeleton className="h-10 w-10" shape="circle" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-[55%]" shape="line" />
            <Skeleton className="h-2.5 w-[75%]" shape="line" />
          </div>
        </div>
      ))}
    </div>
  );
}
