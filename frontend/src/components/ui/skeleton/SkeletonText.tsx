import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export default function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          className={cn("h-3", index === lines - 1 ? "w-[70%]" : "w-full")}
          key={index}
          shape="line"
        />
      ))}
    </div>
  );
}
