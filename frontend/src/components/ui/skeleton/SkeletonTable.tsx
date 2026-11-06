import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonTableProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

export default function SkeletonTable({ rows = 4, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          className={cn(
            "grid items-center gap-3 rounded-xl border border-[#edf1f1] bg-white p-3",
            rowIndex === 0 ? "sm:grid-cols-[1.2fr_1fr_1fr_1fr]" : "grid-cols-4",
          )}
          key={rowIndex}
        >
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              className={cn(
                "h-3",
                columnIndex === 0 ? "w-[80%]" : columnIndex === columns - 1 ? "w-[50%]" : "w-full",
              )}
              key={`${rowIndex}-${columnIndex}`}
              shape="line"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
