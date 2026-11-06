import { cn } from "@/lib/cn";

import Skeleton from "./Skeleton";

export type SkeletonBadgeProps = {
  className?: string;
  width?: string;
};

export default function SkeletonBadge({ className, width = "w-20" }: SkeletonBadgeProps) {
  return <Skeleton className={cn("h-6 rounded-full", width, className)} shape="rect" />;
}
