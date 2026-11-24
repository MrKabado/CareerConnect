import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";
import SkeletonAvatar from "./SkeletonAvatar";
import SkeletonText from "./SkeletonText";

export type SkeletonCardProps = {
  className?: string;
  showHeader?: boolean;
  lines?: number;
  compact?: boolean;
};

export default function SkeletonCard({
  className,
  showHeader = true,
  lines = 3,
  compact = false,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border border-[#e7eeed] bg-white p-4 shadow-[0_8px_24px_rgba(34,66,65,0.05)]",
        compact && "p-3",
        className,
      )}
    >
      {showHeader && (
        <div className="mb-4 flex items-center gap-3">
          <SkeletonAvatar size="h-10 w-10" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3 w-28" shape="line" />
            <Skeleton className="h-2.5 w-20" shape="line" />
          </div>
        </div>
      )}

      <SkeletonText className={compact ? "space-y-1.5" : "space-y-2"} lines={lines} />
    </div>
  );
}
